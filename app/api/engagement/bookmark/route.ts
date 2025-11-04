/**
 * Optimized bookmark/unbookmark API
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

    const { entityType, entityId, bookmarked } = await request.json();
    
    if (!entityType || !entityId || typeof bookmarked !== 'boolean') {
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

    // Check if entity exists
    const { data: entity, error: entityError } = await supabase
      .from(`${entityType}s`)
      .select('id')
      .eq('id', entityId)
      .single();

    if (entityError || !entity) {
      return NextResponse.json({ success: false, error: "Entity not found" }, { status: 404 });
    }

    // Check if user already bookmarked this entity
    const { data: existingBookmark } = await supabase
      .from(`${entityType}_bookmarks`)
      .select('id')
      .eq(`${entityType}_id`, entityId)
      .eq('user_id', userId)
      .single();

    if (bookmarked && !existingBookmark) {
      // Add bookmark
      const { error: bookmarkError } = await supabase
        .from(`${entityType}_bookmarks`)
        .insert({
          [`${entityType}_id`]: entityId,
          user_id: userId,
        });

      if (bookmarkError) {
        console.error('Bookmark error:', bookmarkError);
        return NextResponse.json({ success: false, error: "Failed to bookmark entity" }, { status: 500 });
      }
    } else if (!bookmarked && existingBookmark) {
      // Remove bookmark
      const { error: unbookmarkError } = await supabase
        .from(`${entityType}_bookmarks`)
        .delete()
        .eq(`${entityType}_id`, entityId)
        .eq('user_id', userId);

      if (unbookmarkError) {
        console.error('Unbookmark error:', unbookmarkError);
        return NextResponse.json({ success: false, error: "Failed to unbookmark entity" }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        bookmarked,
      }
    });

  } catch (error) {
    console.error('Bookmark/unbookmark error:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to bookmark/unbookmark entity" 
    }, { status: 500 });
  }
}
