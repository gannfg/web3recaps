import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { NewsArticleResponse } from '@/lib/news-types';
import { z } from 'zod';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  featured_image_url: z.string().optional(),
  featured_image_alt: z.string().optional(),
  author_name: z.string().optional(),
  author_email: z.string().email().optional(),
  author_bio: z.string().optional(),
  author_avatar_url: z.string().optional(),
  author_twitter: z.string().optional(),
  author_linkedin: z.string().optional(),
  category_id: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source_type: z.enum(['internal', 'external']).optional(),
  external_url: z.string().url().optional(),
  external_source: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  is_breaking: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_trending: z.boolean().optional(),
  is_editor_pick: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
  editor_notes: z.string().optional(),
  content_type: z.enum(['article', 'video', 'podcast']).optional(),
  language: z.string().optional(),
  reading_level: z.string().optional(),
  allow_comments: z.boolean().optional(),
  allow_sharing: z.boolean().optional(),
  allow_bookmarking: z.boolean().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.array(z.string()).optional(),
  canonical_url: z.string().url().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image_url: z.string().url().optional(),
  twitter_title: z.string().optional(),
  twitter_description: z.string().optional(),
  twitter_image_url: z.string().url().optional(),
  word_count: z.number().int().min(0).optional(),
  reading_time: z.number().int().min(0).optional(),
  published_at: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    
    const { slug } = params;

    // Check if the parameter is a UUID (ID) or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
    
    console.log('=== API NEWS DEBUG ===');
    console.log('Parameter:', slug);
    console.log('Is UUID:', isUUID);

    // Get article with all relations
    const { data: article, error } = await supabase
      .from('news_articles')
      .select(`
        *,
        author:users(id, display_name, avatar_url, role),
        category:news_categories(*),
        reactions:news_article_reactions(*),
        comments:news_article_comments(
          *,
          author:users(id, display_name, avatar_url),
          replies:news_article_comments(
            *,
            author:users(id, display_name, avatar_url)
          )
        ),
        bookmarks:news_article_bookmarks(*)
      `)
      .eq(isUUID ? 'id' : 'slug', slug)
      .single();

    if (error) {
      console.error('Error fetching article:', error);
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    if (!article) {
      console.log('No article found for parameter:', slug);
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    console.log('=== API NEWS SUCCESS ===');
    console.log('Article ID:', article.id);
    console.log('Article title:', article.title);
    console.log('Article content length:', article.content?.length || 0);
    console.log('Article content preview:', article.content?.substring(0, 200) + '...');
    console.log('Article status:', article.status);

    // Increment view count (only for public viewing, not editing)
    if (!isUUID) { // Only increment if it's a slug (public view)
      await supabase
        .from('news_articles')
        .update({ 
          view_count: (article.view_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id);
    }

    // Get related articles (same category, excluding current article)
    const { data: relatedArticles } = await supabase
      .from('news_articles')
      .select(`
        *,
        author:users(id, display_name, avatar_url, role),
        category:news_categories(*)
      `)
      .eq('category_id', article.category_id)
      .eq('status', 'published')
      .neq('id', article.id)
      .order('published_at', { ascending: false })
      .limit(4);

    console.log('Retrieved article content:', article.content?.substring(0, 100) + '...');
    
    const response: NewsArticleResponse = {
      success: true,
      data: {
        article: {
          ...article,
          view_count: !isUUID ? (article.view_count || 0) + 1 : article.view_count, // Updated count only for public view
        },
        related_articles: relatedArticles || [],
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching news article:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    // Check if the parameter is a UUID (ID) or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
    const articleIdentifier = isUUID ? 'id' : 'slug';

    // Check if user has permission to update articles
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!userRole || !['Admin', 'Author', 'ADMIN', 'AUTHOR'].includes(userRole.role)) {
      return NextResponse.json({ 
        success: false, 
        error: "Insufficient permissions to update articles" 
      }, { status: 403 });
    }

    // Get current article to check ownership (authors can only edit their own articles)
    const { data: currentArticle } = await supabase
      .from('news_articles')
      .select('author_id, status')
      .eq(articleIdentifier, slug)
      .single();

    if (!currentArticle) {
      return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
    }

    // Authors can only edit their own articles, Admins can edit any article
    if ((userRole.role === 'Author' || userRole.role === 'AUTHOR') && currentArticle.author_id !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: "You can only update your own articles" 
      }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateArticleSchema.parse(body);

    // Handle published_at timestamp
    let published_at: string | undefined = validatedData.published_at;
    if (validatedData.status === 'published' && currentArticle.status !== 'published') {
      published_at = new Date().toISOString();
    } else if (validatedData.status !== 'published') {
      published_at = undefined;
    }

    console.log('=== API UPDATE DEBUG ===');
    console.log('Validated data content length:', validatedData.content?.length || 0);
    console.log('Validated data content preview:', validatedData.content?.substring(0, 100) + '...');
    console.log('Status:', validatedData.status);
    console.log('Full validated data:', validatedData);

    const { data: updatedArticle, error } = await supabase
      .from('news_articles')
      .update({ 
        ...validatedData,
        updated_at: new Date().toISOString(),
        published_at: published_at,
      })
      .eq(articleIdentifier, slug)
      .select(`
        *,
        author:users(id, display_name, avatar_url, role),
        category:news_categories(*)
      `)
      .single();

    if (error) {
      console.error('Error updating article:', error);
      
      // Check for specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          success: false, 
          error: 'An article with this title already exists. Please choose a different title.' 
        }, { status: 400 });
      } else if (error.code === '23503') { // Foreign key constraint violation
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid category or author. Please check your selections.' 
        }, { status: 400 });
      } else if (error.code === '23502') { // Not null constraint violation
        return NextResponse.json({ 
          success: false, 
          error: 'Required fields are missing. Please fill in all required information.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update article' 
      }, { status: 500 });
    }

    console.log('=== API UPDATE SUCCESS ===');
    console.log('Updated article content length:', updatedArticle?.content?.length || 0);
    console.log('Updated article content preview:', updatedArticle?.content?.substring(0, 100) + '...');
    console.log('Updated article status:', updatedArticle?.status);

    // Award XP for publishing article (only if status changed from draft to published)
    if (validatedData.status === 'published' && currentArticle.status !== 'published') {
      // Award XP for publishing news article
      awardXp(userId, XP_VALUES.CREATE_NEWS_ARTICLE, "Published news article", {
        articleId: updatedArticle.id,
        articleTitle: updatedArticle.title,
        articleSlug: updatedArticle.slug
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });

      // Check if it's user's first published news article and award bonus
      const { count } = await supabase
        .from('news_articles')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('status', 'published');
      
      if (count === 1) {
        awardXp(userId, XP_VALUES.FIRST_POST, "First news article published", {
          articleId: updatedArticle.id
        }).catch(() => {
          // Silently fail - XP will be handled by background processes
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: { article: updatedArticle } 
    });

  } catch (error) {
    console.error('Error in article update:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Check if user has permission to delete articles
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!userRole || !['Admin', 'ADMIN'].includes(userRole.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions to delete articles' }, { status: 403 });
    }

    // Check if the parameter is a UUID (ID) or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
    const articleIdentifier = isUUID ? 'id' : 'slug';

    // Soft delete by archiving
    const { error } = await supabase
      .from('news_articles')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq(articleIdentifier, slug);

    if (error) {
      console.error('Error archiving news article:', error);
      return NextResponse.json({ success: false, error: 'Failed to archive news article' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Article archived successfully' });
  } catch (error) {
    console.error('Error in news DELETE:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
