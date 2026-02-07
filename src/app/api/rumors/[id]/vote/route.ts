/**
 * Vote API Route
 * 
 * POST /api/rumors/:id/vote - Cast vote (verify/dispute)
 * - Validates uniqueness via vote hash
 * - Checks rate limits
 * - Returns updated truth score
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRumor } from '@/lib/engine/rumorLifecycle';
import { auth } from '@clerk/nextjs/server';
import { addVoteAndRecalculate } from '@/lib/engine/truthScore';
import { getOrCreateUser, recordPendingUpdate, getUserCredibility } from '@/lib/engine/credibility';
import { processCredibilityUpdates } from '@/lib/engine/credibility';
import { generateUserToken, generateVoteToken, generateUserTokenFromId } from '@/lib/auth/anonymousIdentity';
import { checkRateLimit, recordVoteForRateLimit, getEffectiveVoteWeight } from '@/lib/auth/sybilResistance';
import { db } from '@/lib/db';
import { votes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rumorId } = await params;
    const body = await request.json();
    const { vote, fingerprint } = body;

    // Validate vote value
    if (vote !== 'verify' && vote !== 'dispute') {
      return NextResponse.json(
        { success: false, error: 'Vote must be "verify" or "dispute"' },
        { status: 400 }
      );
    }

    // Validate fingerprint
    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Fingerprint is required' },
        { status: 400 }
      );
    }

    // Get rumor
    const rumor = await getRumor(rumorId);
    if (!rumor) {
      return NextResponse.json(
        { success: false, error: 'Rumor not found' },
        { status: 404 }
      );
    }

    // Check if rumor is locked
    if (rumor.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Rumor is locked and no longer accepting votes' },
        { status: 400 }
      );
    }

    // Use Clerk ID if logged in, otherwise use device fingerprint
    const { userId } = await auth();
    const userToken = userId 
      ? generateUserTokenFromId(userId)
      : generateUserToken(fingerprint);

    // Get or create user
    const user = await getOrCreateUser(userToken);

    // Check rate limits
    const rateLimit = await checkRateLimit(userToken);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: rateLimit.reason,
          waitTimeMs: rateLimit.waitTimeMs,
        },
        { status: 429 }
      );
    }

    // Generate vote hash for uniqueness check
    const voteHash = generateVoteToken(rumorId, userToken);

    // Check if already voted
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(eq(votes.voteHash, voteHash));

    if (existingVote) {
      return NextResponse.json(
        { success: false, error: 'You have already voted on this rumor' },
        { status: 400 }
      );
    }

    // Calculate vote value
    const voteValue: 1 | -1 = vote === 'verify' ? 1 : -1;

    // Get effective vote weight (reduces impact of low-credibility users)
    const effectiveCredibility = getEffectiveVoteWeight(user.credibility);

    // Record vote
    await db.insert(votes).values({
      voteHash,
      rumorId,
      voteValue,
      voterCredibility: effectiveCredibility.toFixed(4),
    });

    // Record for rate limiting
    await recordVoteForRateLimit(userToken);

    // Record pending credibility update
    await recordPendingUpdate(userToken, rumorId, voteValue);

    // Update truth score
    const result = await addVoteAndRecalculate(rumorId, voteValue, effectiveCredibility);

    // If rumor just locked, process credibility updates
    if (result.shouldLock && result.newStatus !== 'open') {
      await processCredibilityUpdates(rumorId, result.newStatus as 'verified' | 'disputed');
    }

    return NextResponse.json({
      success: true,
      data: {
        truthScore: result.truthScore,
        voteCount: result.voteCount,
        status: result.newStatus,
        isLocked: result.shouldLock,
        yourVote: vote,
        yourCredibility: user.credibility,
        effectiveWeight: effectiveCredibility,
      },
    });
  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cast vote' },
      { status: 500 }
    );
  }
}
