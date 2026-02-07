/**
 * Rumor DAG (Directed Acyclic Graph) System
 * 
 * Manages relationships between rumors through references.
 * 
 * Rules:
 * - Rumors can reference other rumors (e.g., #R123)
 * - References form a DAG (no cycles)
 * - When a rumor is deleted:
 *   - Only edges are removed
 *   - Other rumor scores are unaffected
 *   - No score leakage from deleted rumors
 */

import { db } from '@/lib/db';
import { rumorReferences, rumors } from '@/lib/db/schema';
import { eq, or, and, inArray } from 'drizzle-orm';

// Pattern to match rumor references in content
const REFERENCE_PATTERN = /#R([a-f0-9-]{36})/gi;

export interface RumorReference {
  sourceId: string;
  targetId: string;
}

export interface DAGNode {
  rumorId: string;
  incomingRefs: string[];
  outgoingRefs: string[];
}

/**
 * Parse rumor content for references to other rumors
 */
export function parseReferences(content: string): string[] {
  const matches = content.matchAll(REFERENCE_PATTERN);
  const references: string[] = [];
  
  for (const match of matches) {
    if (match[1]) {
      references.push(match[1]);
    }
  }
  
  return [...new Set(references)]; // Remove duplicates
}

/**
 * Create references for a new rumor
 */
export async function createReferences(
  sourceRumorId: string,
  content: string
): Promise<string[]> {
  const targetIds = parseReferences(content);
  
  if (targetIds.length === 0) {
    return [];
  }

  // Verify target rumors exist and are not deleted
  const validTargets = await db
    .select({ rumorId: rumors.rumorId })
    .from(rumors)
    .where(
      and(
        inArray(rumors.rumorId, targetIds),
        or(
          eq(rumors.status, 'open'),
          eq(rumors.status, 'verified'),
          eq(rumors.status, 'disputed')
        )
      )
    );

  const validTargetIds = validTargets.map(r => r.rumorId);

  // Check for cycles before adding references
  for (const targetId of validTargetIds) {
    const wouldCreateCycle = await checkForCycle(sourceRumorId, targetId);
    if (wouldCreateCycle) {
      console.warn(`Skipping reference ${sourceRumorId} -> ${targetId} (would create cycle)`);
      continue;
    }

    // Create reference
    await db.insert(rumorReferences).values({
      sourceRumorId,
      targetRumorId: targetId,
    }).onDuplicateKeyUpdate({ set: { sourceRumorId } }); // No-op on duplicate
  }

  return validTargetIds;
}

/**
 * Check if adding an edge would create a cycle
 * 
 * Uses DFS to check if target can reach source
 */
async function checkForCycle(sourceId: string, targetId: string): Promise<boolean> {
  const visited = new Set<string>();
  const stack = [targetId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    
    if (current === sourceId) {
      return true; // Cycle detected
    }

    if (visited.has(current)) {
      continue;
    }
    
    visited.add(current);

    // Get outgoing references from current
    const outgoing = await db
      .select({ targetId: rumorReferences.targetRumorId })
      .from(rumorReferences)
      .where(eq(rumorReferences.sourceRumorId, current));

    for (const ref of outgoing) {
      if (!visited.has(ref.targetId)) {
        stack.push(ref.targetId);
      }
    }
  }

  return false;
}

/**
 * Get all references for a rumor (both incoming and outgoing)
 */
export async function getRumorReferences(rumorId: string): Promise<DAGNode> {
  const incoming = await db
    .select({ sourceId: rumorReferences.sourceRumorId })
    .from(rumorReferences)
    .where(eq(rumorReferences.targetRumorId, rumorId));

  const outgoing = await db
    .select({ targetId: rumorReferences.targetRumorId })
    .from(rumorReferences)
    .where(eq(rumorReferences.sourceRumorId, rumorId));

  return {
    rumorId,
    incomingRefs: incoming.map(r => r.sourceId),
    outgoingRefs: outgoing.map(r => r.targetId),
  };
}

/**
 * Remove all references involving a rumor (called when rumor is deleted)
 * 
 * This removes only the edges, not affecting other rumor scores.
 */
export async function removeRumorFromDAG(rumorId: string): Promise<{
  removedIncoming: number;
  removedOutgoing: number;
}> {
  // Get counts before deletion for return value
  const incoming = await db
    .select()
    .from(rumorReferences)
    .where(eq(rumorReferences.targetRumorId, rumorId));

  const outgoing = await db
    .select()
    .from(rumorReferences)
    .where(eq(rumorReferences.sourceRumorId, rumorId));

  // Delete incoming references (other rumors referencing this one)
  await db
    .delete(rumorReferences)
    .where(eq(rumorReferences.targetRumorId, rumorId));

  // Delete outgoing references (this rumor referencing others)
  await db
    .delete(rumorReferences)
    .where(eq(rumorReferences.sourceRumorId, rumorId));

  return {
    removedIncoming: incoming.length,
    removedOutgoing: outgoing.length,
  };
}

/**
 * Get all rumors that reference a specific rumor
 */
export async function getReferencingRumors(rumorId: string): Promise<string[]> {
  const refs = await db
    .select({ sourceId: rumorReferences.sourceRumorId })
    .from(rumorReferences)
    .where(eq(rumorReferences.targetRumorId, rumorId));

  return refs.map(r => r.sourceId);
}

/**
 * Get all rumors referenced by a specific rumor
 */
export async function getReferencedRumors(rumorId: string): Promise<string[]> {
  const refs = await db
    .select({ targetId: rumorReferences.targetRumorId })
    .from(rumorReferences)
    .where(eq(rumorReferences.sourceRumorId, rumorId));

  return refs.map(r => r.targetId);
}

/**
 * Format a rumor ID as a reference string
 */
export function formatReference(rumorId: string): string {
  return `#R${rumorId}`;
}
