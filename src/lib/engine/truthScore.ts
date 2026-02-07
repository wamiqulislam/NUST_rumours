/**
 * Truth Score Calculation Engine
 * 
 * Implements credibility-weighted voting:
 * T(R) = Σ(s(v) · C(v)) / Σ(C(v))
 * 
 * Where:
 * - s(v) = +1 for verify, -1 for dispute
 * - C(v) = voter credibility ∈ [0,1]
 */

import { db } from '@/lib/db';
import { rumors, votes } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export interface TruthScoreResult {
  truthScore: number;
  voteCount: number;
  totalCredibilityWeight: number;
  shouldLock: boolean;
  newStatus: 'open' | 'verified' | 'disputed';
}

// Minimum votes required before locking can occur
const MIN_VOTES_FOR_LOCK = 5;

// Thresholds for locking
const VERIFIED_THRESHOLD = 0.75;
const DISPUTED_THRESHOLD = 0.25;

// Minimum total credibility weight before score is considered significant
const MIN_CREDIBILITY_WEIGHT = 2.0;

/**
 * Calculate truth score using credibility-weighted voting
 */
export function calculateTruthScore(
  weightedVoteSum: number,
  totalCredibilityWeight: number
): number {
  // If no credibility weight, return neutral
  if (totalCredibilityWeight <= 0) {
    return 0.5;
  }

  // Calculate weighted average: raw result is in [-1, 1]
  const rawScore = weightedVoteSum / totalCredibilityWeight;
  
  // Normalize to [0, 1] range: (rawScore + 1) / 2
  return (rawScore + 1) / 2;
}

/**
 * Add a vote and recalculate truth score
 */
export async function addVoteAndRecalculate(
  rumorId: string,
  voteValue: 1 | -1,
  voterCredibility: number
): Promise<TruthScoreResult> {
  // Get current rumor state
  const [rumor] = await db
    .select()
    .from(rumors)
    .where(eq(rumors.rumorId, rumorId));

  if (!rumor) {
    throw new Error('Rumor not found');
  }

  if (rumor.status !== 'open') {
    throw new Error('Rumor is locked and no longer accepting votes');
  }

  // Calculate new weighted values
  const currentWeightedSum = parseFloat(rumor.weightedVoteSum);
  const currentTotalWeight = parseFloat(rumor.totalCredibilityWeight);
  const currentVoteCount = rumor.voteCount;

  const newWeightedSum = currentWeightedSum + (voteValue * voterCredibility);
  const newTotalWeight = currentTotalWeight + voterCredibility;
  const newVoteCount = currentVoteCount + 1;

  // Calculate new truth score
  const newTruthScore = calculateTruthScore(newWeightedSum, newTotalWeight);

  // Determine if should lock
  const shouldLock = 
    newVoteCount >= MIN_VOTES_FOR_LOCK && 
    newTotalWeight >= MIN_CREDIBILITY_WEIGHT &&
    (newTruthScore >= VERIFIED_THRESHOLD || newTruthScore <= DISPUTED_THRESHOLD);

  // Determine new status
  let newStatus: 'open' | 'verified' | 'disputed' = 'open';
  if (shouldLock) {
    newStatus = newTruthScore >= VERIFIED_THRESHOLD ? 'verified' : 'disputed';
  }

  // Update rumor in database
  await db
    .update(rumors)
    .set({
      weightedVoteSum: newWeightedSum.toFixed(4),
      totalCredibilityWeight: newTotalWeight.toFixed(4),
      voteCount: newVoteCount,
      truthScore: newTruthScore.toFixed(4),
      status: newStatus,
      lockedAt: shouldLock ? sql`CURRENT_TIMESTAMP` : null,
    })
    .where(eq(rumors.rumorId, rumorId));

  return {
    truthScore: newTruthScore,
    voteCount: newVoteCount,
    totalCredibilityWeight: newTotalWeight,
    shouldLock,
    newStatus,
  };
}

/**
 * Get truth score for a rumor
 */
export async function getTruthScore(rumorId: string): Promise<number | null> {
  const [rumor] = await db
    .select({ truthScore: rumors.truthScore })
    .from(rumors)
    .where(eq(rumors.rumorId, rumorId));

  return rumor ? parseFloat(rumor.truthScore) : null;
}

/**
 * Check if rumor should be locked based on current state
 */
export function shouldLockRumor(
  truthScore: number,
  voteCount: number,
  totalCredibilityWeight: number
): { shouldLock: boolean; status: 'verified' | 'disputed' | null } {
  if (voteCount < MIN_VOTES_FOR_LOCK || totalCredibilityWeight < MIN_CREDIBILITY_WEIGHT) {
    return { shouldLock: false, status: null };
  }

  if (truthScore >= VERIFIED_THRESHOLD) {
    return { shouldLock: true, status: 'verified' };
  }

  if (truthScore <= DISPUTED_THRESHOLD) {
    return { shouldLock: true, status: 'disputed' };
  }

  return { shouldLock: false, status: null };
}

// Export constants for testing
export const THRESHOLDS = {
  VERIFIED: VERIFIED_THRESHOLD,
  DISPUTED: DISPUTED_THRESHOLD,
  MIN_VOTES: MIN_VOTES_FOR_LOCK,
  MIN_CREDIBILITY_WEIGHT: MIN_CREDIBILITY_WEIGHT,
};
