import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';
import { ReactionType } from '@/lib/news-types';
import { checkAndRecordAction } from '@/lib/rate-limiting';
import { createNotification } from '@/lib/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    
    const { slug } = params;

    const body = await request.json();
    const { reaction_type }: { reaction_type: ReactionType } = body;

    if (!reaction_type) {
      return NextResponse.json({ success: false, error: 'Reaction type is required' }, { status: 400 });
    }

    // Get article
    const { data: article, error: articleError } = await supabase
      .from('news_articles')
      .select('id, author_id, title')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (articleError || !article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Check if user already reacted
    const { data: existingReaction } = await supabase
      .from('news_article_reactions')
      .select('id, reaction_type')
      .eq('article_id', article.id)
      .eq('user_id', userId)
      .single();

    // Only check rate limit for new reactions (not updates)
    if (!existingReaction) {
      const rateLimitResult = await checkAndRecordAction(userId, 'like_article', {
        cooldownMs: 1000, // 1 second cooldown
        dailyLimit: 100    // 100 article likes per day
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json({ 
          success: false, 
          error: rateLimitResult.reason,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }, { status: 429 });
      }
    }

    if (existingReaction) {
      if (existingReaction.reaction_type === reaction_type) {
        // Remove reaction if same type
        await supabase
          .from('news_article_reactions')
          .delete()
          .eq('id', existingReaction.id);

        // Update article like count
        await supabase
          .from('news_articles')
          .update({ 
            like_count: Math.max(0, (await supabase
              .from('news_article_reactions')
              .select('id', { count: 'exact' })
              .eq('article_id', article.id)
            ).count || 0)
          })
          .eq('id', article.id);

        return NextResponse.json({ success: true, message: 'Reaction removed' });
      } else {
        // Update reaction type
        await supabase
          .from('news_article_reactions')
          .update({ reaction_type })
          .eq('id', existingReaction.id);
      }
    } else {
      // Add new reaction
      await supabase
        .from('news_article_reactions')
        .insert({
          article_id: article.id,
          user_id: userId,
          reaction_type,
        });

      // Award XP for liking article (only for new reactions)
      awardXp(userId, XP_VALUES.LIKE_ARTICLE, "Liked news article", {
        articleId: article.id,
        reactionType: reaction_type
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });

      // Notify article author about the reaction (only for new reactions)
      if (article.author_id !== userId) {
        createNotification({
          userId: article.author_id,
          type: 'news_comment', // Using news_comment type for article engagement
          title: 'New reaction on your article',
          message: `Someone reacted to your article "${article.title}"`,
          actionUrl: `/news/${slug}`,
          actorId: userId,
          entityType: 'news_article',
          entityId: article.id
        }).catch(() => {
          // Silently fail - notifications are not critical
        });
      }
    }

    // Update article like count
    const { count: likeCount } = await supabase
      .from('news_article_reactions')
      .select('id', { count: 'exact' })
      .eq('article_id', article.id);

    await supabase
      .from('news_articles')
      .update({ 
        like_count: likeCount || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id);

    return NextResponse.json({ success: true, message: 'Reaction updated successfully' });
  } catch (error) {
    console.error('Error handling reaction:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    
    const { slug } = params;

    // Get article
    const { data: article, error: articleError } = await supabase
      .from('news_articles')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (articleError || !article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Get reactions with user info
    const { data: reactions, error } = await supabase
      .from('news_article_reactions')
      .select(`
        *,
        user:users(id, display_name, avatar_url)
      `)
      .eq('article_id', article.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reactions:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch reactions' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { reactions: reactions || [] } });
  } catch (error) {
    console.error('Error in reactions GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}