/**
 * Optimized batch engagement API for loading multiple entities' engagement data at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const { entityType, ids } = await request.json();
    
    if (!entityType || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }

    // Validate entity type
    const validTypes = ['article', 'post', 'project', 'event'];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json({ success: false, error: "Invalid entity type" }, { status: 400 });
    }

    // Get engagement data for all entities in a single query
    const engagementData: Record<string, any> = {};

    // Get all engagement data for each entity individually (simpler approach)
    for (const id of ids) {
      // Get like count and user's like status
      const likeTableName = entityType === 'article' ? 'news_article_reactions' : `${entityType}_likes`;
      const likeIdColumn = entityType === 'article' ? 'article_id' : `${entityType}_id`;
      
      const { count: likeCount } = await supabase
        .from(likeTableName)
        .select('*', { count: 'exact', head: true })
        .eq(likeIdColumn, id);

      const { data: userLike } = await supabase
        .from(likeTableName)
        .select('id')
        .eq(likeIdColumn, id)
        .eq('user_id', userId)
        .single();

      // Get bookmark count and user's bookmark status
      const bookmarkTableName = entityType === 'article' ? 'news_article_bookmarks' : `${entityType}_bookmarks`;
      const bookmarkIdColumn = entityType === 'article' ? 'article_id' : `${entityType}_id`;
      
      const { count: bookmarkCount } = await supabase
        .from(bookmarkTableName)
        .select('*', { count: 'exact', head: true })
        .eq(bookmarkIdColumn, id);

      const { data: userBookmark } = await supabase
        .from(bookmarkTableName)
        .select('id')
        .eq(bookmarkIdColumn, id)
        .eq('user_id', userId)
        .single();

      // Get comment count
      const commentTableName = entityType === 'article' ? 'news_article_comments' : `${entityType}_comments`;
      const commentIdColumn = entityType === 'article' ? 'article_id' : `${entityType}_id`;
      
      const { count: commentCount } = await supabase
        .from(commentTableName)
        .select('*', { count: 'exact', head: true })
        .eq(commentIdColumn, id);

      engagementData[id] = {
        isLiked: !!userLike,
        isBookmarked: !!userBookmark,
        likeCount: likeCount || 0,
        commentCount: commentCount || 0,
        bookmarkCount: bookmarkCount || 0,
      };
    }

    return NextResponse.json({ 
      success: true, 
      data: engagementData 
    });

  } catch (error) {
    console.error('Batch engagement error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
