/**
 * Comments API Route
 * 
 * GET /api/rumors/:id/comments - List anonymous comments
 * POST /api/rumors/:id/comments - Add anonymous comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRumor } from '@/lib/engine/rumorLifecycle';
import { generateCommentId } from '@/lib/auth/anonymousIdentity';
import { db } from '@/lib/db';
import { comments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rumorId } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify rumor exists
    const rumor = await getRumor(rumorId);
    if (!rumor) {
      return NextResponse.json(
        { success: false, error: 'Rumor not found' },
        { status: 404 }
      );
    }

    const rumorComments = await db
      .select()
      .from(comments)
      .where(eq(comments.rumorId, rumorId))
      .orderBy(desc(comments.createdAt))
      .limit(Math.min(limit, 100))
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: rumorComments.map(c => ({
        id: c.commentId,
        content: c.content,
        createdAt: c.createdAt,
      })),
      pagination: {
        limit,
        offset,
        hasMore: rumorComments.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rumorId } = await params;
    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Comment is too short' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Comment is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Verify rumor exists
    const rumor = await getRumor(rumorId);
    if (!rumor) {
      return NextResponse.json(
        { success: false, error: 'Rumor not found' },
        { status: 404 }
      );
    }

    // Generate comment ID
    const commentId = generateCommentId();

    // Insert comment
    await db.insert(comments).values({
      commentId,
      rumorId,
      content: content.trim(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: commentId,
        content: content.trim(),
        createdAt: new Date(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
