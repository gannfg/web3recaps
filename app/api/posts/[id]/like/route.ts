import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';
import { checkAndRecordAction } from '@/lib/rate-limiting';
import { notifyPostEngagement } from '@/lib/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    const supabase = createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const body = await request.json();
    const { liked } = body;

    

    // First, get the post data including author_id
    const { data: postData, error: postError } = await auth.supabase
      .from('posts')
      .select('short_id, author_id')
      .eq('id', postId)
      .single();

    if (postError || !postData) {
      console.error('Post fetch error:', postError);
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    if (liked) {
      // Check rate limit for liking posts
      const rateLimitResult = await checkAndRecordAction(userId, 'like_post', {
        cooldownMs: 1000, // 1 second cooldown
        dailyLimit: 100    // 100 likes per day
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json({ 
          success: false, 
          error: rateLimitResult.reason,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }, { status: 429 });
      }

      // Like the post
      const { error: likeError } = await auth.supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          post_short_id: postData.short_id,
          user_id: userId
        });

      if (likeError) {
        console.error('Like error:', likeError);
        return NextResponse.json({ success: false, error: "Failed to like post" }, { status: 500 });
      }

      // Award XP for liking the post
      awardXp(userId, XP_VALUES.LIKE_POST, "Liked post", { postId }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });

      // Notify post author about the like
      notifyPostEngagement(postId, postData.author_id, userId, 'post_like').catch(() => {
        // Silently fail - notifications are not critical
      });
    } else {
      // Unlike the post
      const { error: unlikeError } = await auth.supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (unlikeError) {
        console.error('Unlike error:', unlikeError);
        return NextResponse.json({ success: false, error: "Failed to unlike post" }, { status: 500 });
      }
    }

    // Get updated counts
    const { data: updatedPost } = await auth.supabase
      .from('posts')
      .select('likes_count, comments_count')
      .eq('id', postId)
      .single();

    return NextResponse.json({ 
      success: true, 
      data: {
        liked,
        likesCount: updatedPost?.likes_count || 0,
        commentsCount: updatedPost?.comments_count || 0,
      }
    });

  } catch (error) {
    console.error('Like/unlike error:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}