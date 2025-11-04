import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';
import { createNotification } from '@/lib/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; commentId: string } }
) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    
    const { commentId } = params;

    // Check if user already liked this comment
    const { data: existingReaction } = await supabase
      .from('news_comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .eq('reaction_type', 'like')
      .single();

    if (existingReaction) {
      // Remove like
      await supabase
        .from('news_comment_reactions')
        .delete()
        .eq('id', existingReaction.id);

      // Update comment like count
      const { count: likeCount } = await supabase
        .from('news_comment_reactions')
        .select('id', { count: 'exact' })
        .eq('comment_id', commentId)
        .eq('reaction_type', 'like');

      await supabase
        .from('news_article_comments')
        .update({ 
          like_count: likeCount || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      return NextResponse.json({ success: true, message: 'Like removed', liked: false, likeCount: likeCount || 0 });
    } else {
      // Add like
      await supabase
        .from('news_comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: userId,
          reaction_type: 'like',
        });

      // Award XP for liking comment
      awardXp(userId, XP_VALUES.LIKE_COMMENT, "Liked news comment", {
        commentId,
        articleId: commentId // We'll need to get this from the comment
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });

      // Get comment author to notify them
      const { data: comment } = await supabase
        .from('news_article_comments')
        .select('user_id, content, article_id')
        .eq('id', commentId)
        .single();

      // Notify comment author about the like
      if (comment && comment.user_id !== userId) {
        createNotification({
          userId: comment.user_id,
          type: 'comment_like',
          title: 'New like on your comment',
          message: `Someone liked your comment "${comment.content.substring(0, 50)}..."`,
          actionUrl: `/news/${params.slug}`,
          actorId: userId,
          entityType: 'comment',
          entityId: commentId
        }).catch(() => {
          // Silently fail - notifications are not critical
        });
      }

      // Update comment like count
      const { count: likeCount } = await supabase
        .from('news_comment_reactions')
        .select('id', { count: 'exact' })
        .eq('comment_id', commentId)
        .eq('reaction_type', 'like');

      await supabase
        .from('news_article_comments')
        .update({ 
          like_count: likeCount || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      return NextResponse.json({ success: true, message: 'Comment liked', liked: true, likeCount: likeCount || 0 });
    }
  } catch (error) {
    console.error('Error handling comment like:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; commentId: string } }
) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    
    const { commentId } = params;

    // Check if user has liked this comment
    const { data: like } = await supabase
      .from('news_comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .eq('reaction_type', 'like')
      .single();

    return NextResponse.json({ success: true, liked: !!like });
  } catch (error) {
    console.error('Error checking comment like status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
