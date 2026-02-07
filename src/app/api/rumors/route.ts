/**
 * Rumors API Routes
 * 
 * GET /api/rumors - List rumors (paginated, filterable)
 * POST /api/rumors - Submit new rumor (AI filtered)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRumor, getRumors } from '@/lib/engine/rumorLifecycle';
import { auth } from '@clerk/nextjs/server';
import { createReferences } from '@/lib/engine/rumorDAG';
import { filterContent, shouldRejectImmediately } from '@/lib/ai/contentFilter';
import { generateRumorId, generateUserTokenFromId } from '@/lib/auth/anonymousIdentity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') as 'open' | 'verified' | 'disputed' | 'all' || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') as 'recent' | 'trending' | 'controversial' || 'recent';

    const rumors = await getRumors({
      status,
      limit: Math.min(limit, 50), // Cap at 50
      offset,
      sortBy,
    });

    return NextResponse.json({
      success: true,
      data: rumors,
      pagination: {
        limit,
        offset,
        hasMore: rumors.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching rumors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rumors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Quick rejection check
    const quickCheck = shouldRejectImmediately(content);
    if (quickCheck.reject) {
      return NextResponse.json(
        { success: false, error: quickCheck.reason },
        { status: 400 }
      );
    }

    // AI content filtering
    const filterResult = await filterContent(content);
    if (!filterResult.approved) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content was not approved',
          reasons: filterResult.reasons,
          categories: filterResult.categories,
        },
        { status: 400 }
      );
    }

    // Generate rumor ID
    const rumorId = generateRumorId();

    // Create rumor
    const rumor = await createRumor(rumorId, content.trim());

    // Process references (DAG)
    const references = await createReferences(rumorId, content);

    return NextResponse.json({
      success: true,
      data: {
        ...rumor,
        references,
        filterConfidence: filterResult.confidence,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating rumor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create rumor' },
      { status: 500 }
    );
  }
}
