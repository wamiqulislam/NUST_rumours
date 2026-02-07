/**
 * User API Route
 * 
 * GET /api/user - Get own credibility score and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserStats, getOrCreateUser } from '@/lib/engine/credibility';
import { generateUserToken } from '@/lib/auth/anonymousIdentity';
import { checkRateLimit, detectSuspiciousPatterns } from '@/lib/auth/sybilResistance';

export async function GET(request: NextRequest) {
  try {
    // Get fingerprint from header or query
    const fingerprint = request.headers.get('x-fingerprint') || 
      new URL(request.url).searchParams.get('fingerprint');

    if (!fingerprint) {
      return NextResponse.json(
        { success: false, error: 'Fingerprint is required' },
        { status: 400 }
      );
    }

    // Generate user token
    const userToken = generateUserToken(fingerprint);

    // Get or create user
    const user = await getOrCreateUser(userToken);

    // Get user stats
    const stats = await getUserStats(userToken);

    // Get rate limit status
    const rateLimit = await checkRateLimit(userToken);

    // Check for suspicious patterns
    const suspiciousCheck = await detectSuspiciousPatterns(userToken);

    return NextResponse.json({
      success: true,
      data: {
        credibility: stats?.credibility ?? user.credibility,
        totalVotes: stats?.totalVotes ?? 0,
        correctVotes: stats?.correctVotes ?? 0,
        accuracy: stats?.accuracy ?? 0.5,
        isNew: user.isNew,
        rateLimit: {
          remainingHourly: rateLimit.remainingHourly,
          remainingDaily: rateLimit.remainingDaily,
        },
        // Only include warning if user is flagged
        ...(suspiciousCheck.isSuspicious && {
          warning: 'Your account has been flagged for unusual activity',
        }),
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}
