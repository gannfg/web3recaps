import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';
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
    const { content, parent_id }: { content: string; parent_id?: string } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Comment content is required' }, { status: 400 });
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

    // Check rate limit for commenting on articles
    const rateLimitResult = await checkAndRecordAction(userId, 'comment_article', {
      cooldownMs: 5000, // 5 second cooldown
      dailyLimit: 30     // 30 article comments per day
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        success: false, 
        error: rateLimitResult.reason,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      }, { status: 429 });
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('news_article_comments')
      .insert({
        article_id: article.id,
        user_id: userId,
        parent_id: parent_id || null,
        content: content.trim(),
        is_approved: true, // Auto-approve for now
      })
      .select(`
        *,
        author:users(id, display_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
    }

    // Award XP for commenting on article
    awardXp(userId, XP_VALUES.COMMENT_ARTICLE, "Commented on news article", {
      articleId: article.id,
      commentId: comment.id
    }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Notify article author about the comment
    if (article.author_id !== userId) {
      createNotification({
        userId: article.author_id,
        type: 'news_comment',
        title: 'New comment on your article',
        message: `Someone commented on your article "${article.title}"`,
        actionUrl: `/news/${slug}`,
        actorId: userId,
        entityType: 'news_article',
        entityId: article.id
      }).catch(() => {
        // Silently fail - notifications are not critical
      });
    }

    // Update article comment count
    const { count: commentCount } = await supabase
      .from('news_article_comments')
      .select('id', { count: 'exact' })
      .eq('article_id', article.id)
      .eq('is_approved', true);

    await supabase
      .from('news_articles')
      .update({ 
        comment_count: commentCount || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id);

    return NextResponse.json({ success: true, data: { comment } }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
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

    // Get comments (only top-level comments, replies will be nested)
    const { data: comments, error } = await supabase
      .from('news_article_comments')
      .select(`
        *,
        author:users(id, display_name, avatar_url),
        replies:news_article_comments(
          *,
          author:users(id, display_name, avatar_url)
        )
      `)
      .eq('article_id', article.id)
      .eq('is_approved', true)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { comments: comments || [] } });
  } catch (error) {
    console.error('Error in comments GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}