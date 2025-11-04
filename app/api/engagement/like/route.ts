/**
 * Optimized like/unlike API with database triggers for automatic count updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 });
    }
    const userId = userRes.user.id;

    const { entityType, entityId, liked } = await request.json();
    
    if (!entityType || !entityId || typeof liked !== 'boolean') {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 });
    }

    

    // Validate entity type
    const validTypes = ['article', 'post', 'project', 'event'];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json({ success: false, error: "Invalid entity type" }, { status: 400 });
    }

    // Check if entity exists
    const { data: entity, error: entityError } = await supabase
      .from(`${entityType}s`)
      .select('id')
      .eq('id', entityId)
      .single();

    if (entityError || !entity) {
      return NextResponse.json({ success: false, error: "Entity not found" }, { status: 404 });
    }

    // Check if user already liked this entity
    const tableName = entityType === 'article' ? 'news_article_reactions' : `${entityType}_likes`;
    const idColumn = entityType === 'article' ? 'article_id' : `${entityType}_id`;
    
    const { data: existingLike } = await supabase
      .from(tableName)
      .select('id')
      .eq(idColumn, entityId)
      .eq('user_id', userId)
      .single();

    if (liked && !existingLike) {
      // Add like
      const insertData = entityType === 'article' 
        ? { article_id: entityId, user_id: userId, reaction_type: 'like' }
        : { [`${entityType}_id`]: entityId, user_id: userId };
        
      const { error: likeError } = await supabase
        .from(tableName)
        .insert(insertData);

      if (likeError) {
        console.error('Like error:', likeError);
        return NextResponse.json({ success: false, error: "Failed to like entity" }, { status: 500 });
      }
    } else if (!liked && existingLike) {
      // Remove like
      const { error: unlikeError } = await supabase
        .from(tableName)
        .delete()
        .eq(idColumn, entityId)
        .eq('user_id', userId);

      if (unlikeError) {
        console.error('Unlike error:', unlikeError);
        return NextResponse.json({ success: false, error: "Failed to unlike entity" }, { status: 500 });
      }
    }

    // Get updated counts (database triggers should handle this automatically)
    let likeCount = 0;
    let commentCount = 0;
    
    if (entityType === 'article') {
      const { data: updatedEntity } = await supabase
        .from('news_articles')
        .select('like_count, comment_count')
        .eq('id', entityId)
        .single();
      
      likeCount = updatedEntity?.like_count || 0;
      commentCount = updatedEntity?.comment_count || 0;
    } else if (entityType === 'post') {
      const { data: updatedEntity } = await supabase
        .from('posts')
        .select('likes_count, comments_count')
        .eq('id', entityId)
        .single();
      
      likeCount = updatedEntity?.likes_count || 0;
      commentCount = updatedEntity?.comments_count || 0;
    } else if (entityType === 'project') {
      const { data: updatedEntity } = await supabase
        .from('projects')
        .select('likes_count')
        .eq('id', entityId)
        .single();
      
      likeCount = updatedEntity?.likes_count || 0;
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        liked,
        likeCount,
        commentCount,
      }
    });

  } catch (error) {
    console.error('Like/unlike error:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to like/unlike entity" 
    }, { status: 500 });
  }
}
