import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { anonymousUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateUserTokenFromId } from '@/lib/auth/anonymousIdentity';

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;

    // Try to get user from request body (Clerk webhook)
    try {
      const body = await request.json();
      if (body.data?.id) {
        userId = body.data.id; // Clerk webhook format
      }
    } catch (e) {
      // If body parsing fails, continue to check currentUser
    }

    // Fallback to currentUser if not from webhook
    if (!userId) {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized: No user logged in' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    // Use raw Clerk user ID as token (no hashing as requested)
    const userToken = generateUserTokenFromId(userId);

    // Check if user already exists
    const existingUser = await db.query.anonymousUsers.findFirst({
      where: eq(anonymousUsers.userToken, userToken),
    });

    if (existingUser) {
      // User already registered - UPDATE last activity
      await db
        .update(anonymousUsers)
        .set({ lastActivity: new Date() })
        .where(eq(anonymousUsers.userToken, userToken));

      console.log(`✅ User already registered. Updated activity: ${userToken}`);
      
      return NextResponse.json(
        { 
          message: 'User already registered. Updated last activity.',
          userToken,
          status: 'updated'
        },
        { status: 200 }
      );
    }

    // User is NEW - CREATE with default values
    console.log(`🆕 Creating new user: ${userToken}`);
    
    await db.insert(anonymousUsers).values({
      userToken,
      credibility: '0.5000', // Default 50%
      createdAt: new Date(),
      lastActivity: new Date(),
      totalVotes: 0,
      correctVotes: 0,
    });

    // Fetch the created user to confirm
    const newUser = await db.query.anonymousUsers.findFirst({
      where: eq(anonymousUsers.userToken, userToken),
    });

    console.log(`✅ New user created successfully: ${userToken}`);

    return NextResponse.json(
      {
        message: 'New user registered successfully',
        userToken,
        user: newUser,
        status: 'created'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error in POST /api/auth/createuser:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

