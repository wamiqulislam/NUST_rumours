/**
 * Rumor Lifecycle Management
 * 
 * States: open → verified (T ≥ 0.75) | disputed (T ≤ 0.25) | deleted
 * 
 * Rules:
 * - Locked rumors stop accepting votes
 * - Locking triggers credibility updates
 * - Locked rumor scores never change
 */

import { db } from '@/lib/db';
import { rumors } from '@/lib/db/schema';
import { eq, sql, and, or, desc } from 'drizzle-orm';
import { processCredibilityUpdates } from './credibility';
import { THRESHOLDS } from './truthScore';

export type RumorStatus = 'open' | 'verified' | 'disputed' | 'deleted';

export interface RumorWithDetails {
  rumorId: string;
  content: string;
  createdAt: Date;
  truthScore: number;
  status: RumorStatus;
  voteCount: number;
  isLocked: boolean;
}

/**
 * Create a new rumor
 */
export async function createRumor(
  rumorId: string,
  content: string
): Promise<RumorWithDetails> {
  await db.insert(rumors).values({
    rumorId,
    content,
    truthScore: '0.5000',
    status: 'open',
    voteCount: 0,
    totalCredibilityWeight: '0.0000',
    weightedVoteSum: '0.0000',
  });

  return {
    rumorId,
    content,
    createdAt: new Date(),
    truthScore: 0.5,
    status: 'open',
    voteCount: 0,
    isLocked: false,
  };
}

/**
 * Get a rumor by ID
 */
export async function getRumor(rumorId: string): Promise<RumorWithDetails | null> {
  const [rumor] = await db
    .select()
    .from(rumors)
    .where(eq(rumors.rumorId, rumorId));

  if (!rumor) return null;

  return {
    rumorId: rumor.rumorId,
    content: rumor.content,
    createdAt: rumor.createdAt,
    truthScore: parseFloat(rumor.truthScore),
    status: rumor.status as RumorStatus,
    voteCount: rumor.voteCount,
    isLocked: rumor.status !== 'open',
  };
}

/**
 * Lock a rumor and process credibility updates
 */
export async function lockRumor(
  rumorId: string,
  newStatus: 'verified' | 'disputed'
): Promise<void> {
  // Update rumor status
  await db
    .update(rumors)
    .set({
      status: newStatus,
      lockedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(rumors.rumorId, rumorId));

  // Process pending credibility updates
  await processCredibilityUpdates(rumorId, newStatus);
}

/**
 * Mark a rumor as deleted
 */
export async function deleteRumor(rumorId: string): Promise<void> {
  await db
    .update(rumors)
    .set({
      status: 'deleted',
    })
    .where(eq(rumors.rumorId, rumorId));
}

/**
 * Get rumors list with filters
 */
export async function getRumors(options: {
  status?: RumorStatus | 'all';
  limit?: number;
  offset?: number;
  sortBy?: 'recent' | 'trending' | 'controversial';
}): Promise<RumorWithDetails[]> {
  const {
    status = 'all',
    limit = 20,
    offset = 0,
    sortBy = 'recent',
  } = options;

  let query = db.select().from(rumors);

  // Filter by status
  if (status !== 'all') {
    query = query.where(eq(rumors.status, status)) as typeof query;
  } else {
    // Exclude deleted rumors from default listing
    query = query.where(
      or(
        eq(rumors.status, 'open'),
        eq(rumors.status, 'verified'),
        eq(rumors.status, 'disputed')
      )
    ) as typeof query;
  }

  // Sorting
  switch (sortBy) {
    case 'trending':
      // Most votes in recent time
      query = query.orderBy(desc(rumors.voteCount)) as typeof query;
      break;
    case 'controversial':
      // Truth score closest to 0.5
      query = query.orderBy(sql`ABS(truth_score - 0.5)`) as typeof query;
      break;
    case 'recent':
    default:
      query = query.orderBy(desc(rumors.createdAt)) as typeof query;
  }

  const result = await query.limit(limit).offset(offset);

  return result.map((rumor) => ({
    rumorId: rumor.rumorId,
    content: rumor.content,
    createdAt: rumor.createdAt,
    truthScore: parseFloat(rumor.truthScore),
    status: rumor.status as RumorStatus,
    voteCount: rumor.voteCount,
    isLocked: rumor.status !== 'open',
  }));
}

/**
 * Check if a rumor can accept votes
 */
export function canAcceptVotes(status: RumorStatus): boolean {
  return status === 'open';
}

/**
 * Get statistics about rumors
 */
export async function getRumorStats(): Promise<{
  total: number;
  open: number;
  verified: number;
  disputed: number;
}> {
  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      open: sql<number>`SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)`,
      verified: sql<number>`SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END)`,
      disputed: sql<number>`SUM(CASE WHEN status = 'disputed' THEN 1 ELSE 0 END)`,
    })
    .from(rumors);

  return {
    total: stats?.total || 0,
    open: stats?.open || 0,
    verified: stats?.verified || 0,
    disputed: stats?.disputed || 0,
  };
}
