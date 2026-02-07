/**
 * User Credibility System
 * 
 * Manages persistent anonymous user credibility scores.
 * 
 * Rules:
 * - Initial credibility: C = 0.5
 * - Update formula: C_new = clip(C_old + α × alignment, 0, 1)
 * - α = 0.05 (adjustment step size)
 * - alignment = +1 if vote matches final outcome, -1 otherwise
 * - Updates only after rumor is locked (finalized)
 */

import { db } from '@/lib/db';
import { anonymousUsers, pendingCredibilityUpdates, votes } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// Credibility adjustment step size
const ALPHA = 0.05;

// Initial credibility for new users
const INITIAL_CREDIBILITY = 0.5;

// Minimum credibility (prevents total exclusion)
const MIN_CREDIBILITY = 0.0;

// Maximum credibility
const MAX_CREDIBILITY = 1.0;

/**
 * Clip value to [min, max] range
 */
function clip(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get or create an anonymous user
 */
export async function getOrCreateUser(userToken: string): Promise<{
  userToken: string;
  credibility: number;
  isNew: boolean;
}> {
  // Try to get existing user
  const [existingUser] = await db
    .select()
    .from(anonymousUsers)
    .where(eq(anonymousUsers.userToken, userToken));

  if (existingUser) {
    return {
      userToken: existingUser.userToken,
      credibility: parseFloat(existingUser.credibility),
      isNew: false,
    };
  }

  // Create new user
  await db.insert(anonymousUsers).values({
    userToken,
    credibility: INITIAL_CREDIBILITY.toFixed(4),
  });

  return {
    userToken,
    credibility: INITIAL_CREDIBILITY,
    isNew: true,
  };
}

/**
 * Get user's current credibility
 */
export async function getUserCredibility(userToken: string): Promise<number> {
  const [user] = await db
    .select({ credibility: anonymousUsers.credibility })
    .from(anonymousUsers)
    .where(eq(anonymousUsers.userToken, userToken));

  return user ? parseFloat(user.credibility) : INITIAL_CREDIBILITY;
}

/**
 * Record a pending credibility update (to be processed when rumor locks)
 */
export async function recordPendingUpdate(
  userToken: string,
  rumorId: string,
  voteValue: number
): Promise<void> {
  await db.insert(pendingCredibilityUpdates).values({
    userToken,
    rumorId,
    voteValue,
    processed: 0,
  });
}

/**
 * Process credibility updates for a locked rumor
 * 
 * Called when a rumor transitions from 'open' to 'verified' or 'disputed'
 */
export async function processCredibilityUpdates(
  rumorId: string,
  finalOutcome: 'verified' | 'disputed'
): Promise<{ updated: number }> {
  // Get all pending updates for this rumor
  const pendingUpdates = await db
    .select()
    .from(pendingCredibilityUpdates)
    .where(
      and(
        eq(pendingCredibilityUpdates.rumorId, rumorId),
        eq(pendingCredibilityUpdates.processed, 0)
      )
    );

  let updatedCount = 0;

  for (const update of pendingUpdates) {
    // Determine alignment: +1 if vote matches outcome, -1 otherwise
    // verified (T >= 0.75) means verify votes (+1) were correct
    // disputed (T <= 0.25) means dispute votes (-1) were correct
    const expectedVote = finalOutcome === 'verified' ? 1 : -1;
    const alignment = update.voteValue === expectedVote ? 1 : -1;

    // Get current credibility
    const [user] = await db
      .select({ credibility: anonymousUsers.credibility })
      .from(anonymousUsers)
      .where(eq(anonymousUsers.userToken, update.userToken));

    if (user) {
      const currentCredibility = parseFloat(user.credibility);
      const newCredibility = clip(
        currentCredibility + ALPHA * alignment,
        MIN_CREDIBILITY,
        MAX_CREDIBILITY
      );

      // Update user credibility
      await db
        .update(anonymousUsers)
        .set({
          credibility: newCredibility.toFixed(4),
          totalVotes: sql`total_votes + 1`,
          correctVotes: alignment === 1 ? sql`correct_votes + 1` : sql`correct_votes`,
        })
        .where(eq(anonymousUsers.userToken, update.userToken));

      updatedCount++;
    }

    // Mark update as processed
    await db
      .update(pendingCredibilityUpdates)
      .set({ processed: 1 })
      .where(eq(pendingCredibilityUpdates.id, update.id));
  }

  return { updated: updatedCount };
}

/**
 * Calculate what a user's new credibility would be after an outcome
 * (for display purposes, doesn't modify database)
 */
export function predictCredibilityChange(
  currentCredibility: number,
  voteValue: number,
  finalOutcome: 'verified' | 'disputed'
): number {
  const expectedVote = finalOutcome === 'verified' ? 1 : -1;
  const alignment = voteValue === expectedVote ? 1 : -1;
  return clip(currentCredibility + ALPHA * alignment, MIN_CREDIBILITY, MAX_CREDIBILITY);
}

/**
 * Get user statistics
 */
export async function getUserStats(userToken: string): Promise<{
  credibility: number;
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
} | null> {
  const [user] = await db
    .select()
    .from(anonymousUsers)
    .where(eq(anonymousUsers.userToken, userToken));

  if (!user) return null;

  const totalVotes = user.totalVotes;
  const correctVotes = user.correctVotes;
  const accuracy = totalVotes > 0 ? correctVotes / totalVotes : 0.5;

  return {
    credibility: parseFloat(user.credibility),
    totalVotes,
    correctVotes,
    accuracy,
  };
}

// Export constants
export const CREDIBILITY_CONFIG = {
  ALPHA,
  INITIAL: INITIAL_CREDIBILITY,
  MIN: MIN_CREDIBILITY,
  MAX: MAX_CREDIBILITY,
};
