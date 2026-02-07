/**
 * Single Rumor API Routes
 * 
 * GET /api/rumors/:id - Get rumor details with score
 * DELETE /api/rumors/:id - Mark as deleted (DAG cleanup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRumor, deleteRumor } from '@/lib/engine/rumorLifecycle';
import { getRumorReferences, removeRumorFromDAG } from '@/lib/engine/rumorDAG';
import { db } from '@/lib/db';
import { comments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rumor = await getRumor(id);
    if (!rumor) {
      return NextResponse.json(
        { success: false, error: 'Rumor not found' },
        { status: 404 }
      );
    }

    // Get references
    const references = await getRumorReferences(id);

    // Get comments
    const rumorComments = await db
      .select()
      .from(comments)
      .where(eq(comments.rumorId, id))
      .orderBy(desc(comments.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        ...rumor,
        references: {
          incoming: references.incomingRefs,
          outgoing: references.outgoingRefs,
        },
        comments: rumorComments.map(c => ({
          id: c.commentId,
          content: c.content,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching rumor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rumor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rumor = await getRumor(id);
    if (!rumor) {
      return NextResponse.json(
        { success: false, error: 'Rumor not found' },
        { status: 404 }
      );
    }

    // Remove from DAG (edges only)
    const dagResult = await removeRumorFromDAG(id);

    // Mark as deleted
    await deleteRumor(id);

    return NextResponse.json({
      success: true,
      message: 'Rumor deleted',
      dagCleanup: dagResult,
    });
  } catch (error) {
    console.error('Error deleting rumor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete rumor' },
      { status: 500 }
    );
  }
}
