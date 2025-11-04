import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';

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

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('news_article_bookmarks')
      .select('id')
      .eq('article_id', article.id)
      .eq('user_id', userId)
      .single();

    if (existingBookmark) {
      // Remove bookmark
      await supabase
        .from('news_article_bookmarks')
        .delete()
        .eq('id', existingBookmark.id);

      return NextResponse.json({ success: true, message: 'Bookmark removed', data: { bookmarked: false } });
    } else {
      // Add bookmark
      await supabase
        .from('news_article_bookmarks')
        .insert({
          article_id: article.id,
          user_id: userId,
        });

      // Award XP for bookmarking article
      awardXp(userId, XP_VALUES.BOOKMARK_ARTICLE, "Bookmarked news article", {
        articleId: article.id
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });

      return NextResponse.json({ success: true, message: 'Article bookmarked', data: { bookmarked: true } });
    }
  } catch (error) {
    console.error('Error handling bookmark:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
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

    // Check if bookmarked
    const { data: bookmark } = await supabase
      .from('news_article_bookmarks')
      .select('id')
      .eq('article_id', article.id)
      .eq('user_id', userId)
      .single();

    return NextResponse.json({ success: true, data: { bookmarked: !!bookmark } });
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
