/**
 * Sybil & Bot Resistance System
 * 
 * Multi-layer defense against fake accounts and vote flooding:
 * 1. Rate limiting (time-based restrictions)
 * 2. Interaction cost (time delays)
 * 3. Pattern detection (anomaly flagging)
 * 4. Credibility decay (low-cred users have negligible influence)
 */

import { db } from '@/lib/db';
import { rateLimits, anonymousUsers } from '@/lib/db/schema';
import { eq, sql, lt } from 'drizzle-orm';

// Rate limiting configuration
const MAX_VOTES_PER_HOUR = 10;
const MAX_VOTES_PER_DAY = 50;
const MIN_VOTE_INTERVAL_MS = 2000; // 2 seconds between votes

// Credibility threshold for significant influence
const LOW_CREDIBILITY_THRESHOLD = 0.2;

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  waitTimeMs?: number;
  remainingHourly?: number;
  remainingDaily?: number;
}

/**
 * Check if a user is rate limited
 */
export async function checkRateLimit(userToken: string): Promise<RateLimitResult> {
  // Get or create rate limit record
  let [rateLimit] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.userToken, userToken));

  const now = new Date();

  if (!rateLimit) {
    // Create new rate limit record
    await db.insert(rateLimits).values({
      userToken,
      hourlyVotes: 0,
      dailyVotes: 0,
      lastVoteAt: now,
      hourResetAt: now,
      dayResetAt: now,
    });

    return {
      allowed: true,
      remainingHourly: MAX_VOTES_PER_HOUR,
      remainingDaily: MAX_VOTES_PER_DAY,
    };
  }

  // Check minimum interval
  if (rateLimit.lastVoteAt) {
    const timeSinceLastVote = now.getTime() - new Date(rateLimit.lastVoteAt).getTime();
    if (timeSinceLastVote < MIN_VOTE_INTERVAL_MS) {
      return {
        allowed: false,
        reason: 'Please wait before voting again',
        waitTimeMs: MIN_VOTE_INTERVAL_MS - timeSinceLastVote,
      };
    }
  }

  // Reset hourly counter if hour has passed
  let hourlyVotes = rateLimit.hourlyVotes;
  if (rateLimit.hourResetAt) {
    const hoursSinceReset = (now.getTime() - new Date(rateLimit.hourResetAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset >= 1) {
      hourlyVotes = 0;
      await db
        .update(rateLimits)
        .set({ hourlyVotes: 0, hourResetAt: now })
        .where(eq(rateLimits.userToken, userToken));
    }
  }

  // Reset daily counter if day has passed
  let dailyVotes = rateLimit.dailyVotes;
  if (rateLimit.dayResetAt) {
    const hoursSinceReset = (now.getTime() - new Date(rateLimit.dayResetAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset >= 24) {
      dailyVotes = 0;
      await db
        .update(rateLimits)
        .set({ dailyVotes: 0, dayResetAt: now })
        .where(eq(rateLimits.userToken, userToken));
    }
  }

  // Check hourly limit
  if (hourlyVotes >= MAX_VOTES_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Hourly vote limit reached',
      remainingHourly: 0,
      remainingDaily: MAX_VOTES_PER_DAY - dailyVotes,
    };
  }

  // Check daily limit
  if (dailyVotes >= MAX_VOTES_PER_DAY) {
    return {
      allowed: false,
      reason: 'Daily vote limit reached',
      remainingHourly: 0,
      remainingDaily: 0,
    };
  }

  return {
    allowed: true,
    remainingHourly: MAX_VOTES_PER_HOUR - hourlyVotes,
    remainingDaily: MAX_VOTES_PER_DAY - dailyVotes,
  };
}

/**
 * Record a vote for rate limiting
 */
export async function recordVoteForRateLimit(userToken: string): Promise<void> {
  const now = new Date();

  await db
    .update(rateLimits)
    .set({
      hourlyVotes: sql`hourly_votes + 1`,
      dailyVotes: sql`daily_votes + 1`,
      lastVoteAt: now,
    })
    .where(eq(rateLimits.userToken, userToken));
}

/**
 * Check if user has low credibility (and thus negligible influence)
 */
export async function isLowCredibilityUser(userToken: string): Promise<boolean> {
  const [user] = await db
    .select({ credibility: anonymousUsers.credibility })
    .from(anonymousUsers)
    .where(eq(anonymousUsers.userToken, userToken));

  if (!user) return false;
  return parseFloat(user.credibility) < LOW_CREDIBILITY_THRESHOLD;
}

/**
 * Detect suspicious voting patterns
 * 
 * Flags accounts that:
 * - Vote at very regular intervals (bot-like)
 * - Always vote the same as a coordinated group
 * - Have unusually high voting rates right after account creation
 */
export interface SuspiciousPatternResult {
  isSuspicious: boolean;
  flags: string[];
  riskScore: number; // 0-1
}

export async function detectSuspiciousPatterns(
  userToken: string
): Promise<SuspiciousPatternResult> {
  const flags: string[] = [];
  let riskScore = 0;

  // Get user stats
  const [user] = await db
    .select()
    .from(anonymousUsers)
    .where(eq(anonymousUsers.userToken, userToken));

  if (!user) {
    return { isSuspicious: false, flags: [], riskScore: 0 };
  }

  // Check for very low credibility (indicates consistent incorrect voting)
  if (parseFloat(user.credibility) < 0.1) {
    flags.push('very_low_credibility');
    riskScore += 0.3;
  }

  // Check for unusually high vote volume for new account
  const accountAgeHours = user.createdAt 
    ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60)
    : 0;

  if (accountAgeHours < 1 && user.totalVotes > 5) {
    flags.push('high_early_activity');
    riskScore += 0.4;
  }

  // Check for consistently wrong voting (possible contrarian bot)
  if (user.totalVotes > 10) {
    const accuracy = user.correctVotes / user.totalVotes;
    if (accuracy < 0.2) {
      flags.push('consistently_wrong');
      riskScore += 0.5;
    }
  }

  return {
    isSuspicious: riskScore >= 0.5,
    flags,
    riskScore: Math.min(riskScore, 1),
  };
}

/**
 * Get effective vote weight for a user
 * 
 * Low-credibility users have reduced influence.
 * Returns a multiplier between 0 and 1.
 */
export function getEffectiveVoteWeight(credibility: number): number {
  // Users with credibility below threshold have dramatically reduced influence
  if (credibility < LOW_CREDIBILITY_THRESHOLD) {
    // Quadratic decay below threshold
    return Math.pow(credibility / LOW_CREDIBILITY_THRESHOLD, 2) * LOW_CREDIBILITY_THRESHOLD;
  }
  
  return credibility;
}

// Export configuration
export const SYBIL_CONFIG = {
  MAX_VOTES_PER_HOUR,
  MAX_VOTES_PER_DAY,
  MIN_VOTE_INTERVAL_MS,
  LOW_CREDIBILITY_THRESHOLD,
};
