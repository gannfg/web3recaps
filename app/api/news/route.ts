import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseWithUser } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { NewsFilters, NewsArticlesResponse } from '@/lib/news-types';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const filters: NewsFilters = {
      category_id: searchParams.get('category_id') || undefined,
      status: (searchParams.get('status') as any) || 'all',
      is_breaking: searchParams.get('is_breaking') === 'true' || undefined,
      is_featured: searchParams.get('is_featured') === 'true' || undefined,
      author_id: searchParams.get('author_id') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      search: searchParams.get('search') || undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'published_at',
      sort_order: (searchParams.get('sort_order') as any) || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    // Build query
    let query = supabase
      .from('news_articles')
      .select(`
        *,
        author:users(id, display_name, avatar_url, role),
        category:news_categories(*),
        reactions:news_article_reactions(*),
        comments:news_article_comments(*),
        bookmarks:news_article_bookmarks(*)
      `);

    // Apply filters
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    if (filters.status && filters.status !== 'all') {
      console.log('Filtering by status:', filters.status);
      query = query.eq('status', filters.status);
    } else {
      console.log('No status filter applied - showing all articles');
    }
    
    if (filters.is_breaking !== undefined) {
      query = query.eq('is_breaking', filters.is_breaking);
    }
    
    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }
    
    if (filters.author_id) {
      query = query.eq('author_id', filters.author_id);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    
    if (filters.date_from) {
      query = query.gte('published_at', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('published_at', filters.date_to);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // Apply sorting
    const sortColumn = filters.sort_by || 'published_at';
    const sortOrder = filters.sort_order || 'desc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 50); // Max 50 per page
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to);

    const { data: articles, error, count } = await query;

    if (error) {
      console.error('Error fetching news articles:', error);
      return NextResponse.json({ error: 'Failed to fetch news articles' }, { status: 500 });
    }

    console.log('Fetched articles:', articles?.length || 0, 'articles');
    console.log('Articles data:', articles);
    console.log('Count:', count);
    console.log('Filters applied:', filters);

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: NewsArticlesResponse = {
      articles: articles || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };

    console.log('Response being sent:', response);
    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error in news GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id
    const supabase = auth.supabase
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });

    // Check if user has permission to create articles
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    console.log('User ID:', userId);
    console.log('User role from database:', userRole);
    console.log('Role check:', userRole?.role, 'in', ['Admin', 'Author']);

    if (!userRole || !['Admin', 'Author', 'ADMIN', 'AUTHOR'].includes(userRole.role)) {
      console.log('Permission denied for user:', userId, 'with role:', userRole?.role);
      return NextResponse.json({ 
        success: false, 
        error: "Insufficient permissions to create articles" 
      }, { status: 403 });
    }

    console.log('Creating article for user:', userId, 'with role:', userRole.role);

    // Get user information for author fields
    const { data: userData } = await supabase
      .from('users')
      .select('display_name, email, bio, avatar_url')
      .eq('id', userId)
      .single();

    const body = await request.json();
    console.log('Received article data:', { 
      title: body.title, 
      content: body.content?.substring(0, 100) + '...',
      contentLength: body.content?.length 
    });
    
    const {
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      featured_image_alt,
      author_name,
      author_email,
      author_bio,
      author_avatar_url,
      author_twitter,
      author_linkedin,
      category_id,
      subcategory,
      tags = [],
      source_type = 'internal',
      external_url,
      external_source,
      status = 'draft',
      is_breaking = false,
      is_featured = false,
      is_trending = false,
      is_editor_pick = false,
      priority = 0,
      editor_notes,
      content_type = 'article',
      language = 'en',
      reading_level = 'intermediate',
      allow_comments = true,
      allow_sharing = true,
      allow_bookmarking = true,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      og_title,
      og_description,
      og_image_url,
      twitter_title,
      twitter_description,
      twitter_image_url,
    } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title and content are required' 
      }, { status: 400 });
    }

    // Handle category_id - get default category if not provided
    let finalCategoryId = category_id;
    if (!finalCategoryId) {
      console.log('No category_id provided, fetching default category');
      const { data: defaultCategory } = await supabase
        .from('news_categories')
        .select('id')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();
      
      if (!defaultCategory) {
        return NextResponse.json({ 
          success: false, 
          error: 'No categories available. Please contact an administrator.' 
        }, { status: 400 });
      }
      
      finalCategoryId = defaultCategory.id;
      console.log('Using default category:', finalCategoryId);
    } else {
      // Validate that the provided category exists
      const { data: categoryExists } = await supabase
        .from('news_categories')
        .select('id')
        .eq('id', finalCategoryId)
        .eq('is_active', true)
        .single();
      
      if (!categoryExists) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid category selected. Please choose a valid category.' 
        }, { status: 400 });
      }
    }

    // Generate slug from title if not provided
    const articleSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Calculate reading time and word count
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Create article
    console.log('=== API CREATE DEBUG ===');
    console.log('Content length:', content?.length || 0);
    console.log('Content preview:', content?.substring(0, 100) + '...');
    console.log('Status:', status);
    console.log('Full body received:', body);
    const { data: article, error } = await supabase
      .from('news_articles')
      .insert({
        title,
        slug: articleSlug,
        excerpt,
        content,
        featured_image_url,
        featured_image_alt,
        author_id: userId,
        author_name: author_name || userData?.display_name || 'Anonymous',
        author_email: author_email || userData?.email,
        author_bio: author_bio || userData?.bio,
        author_avatar_url: author_avatar_url || userData?.avatar_url,
        author_twitter,
        author_linkedin,
        category_id: finalCategoryId,
        subcategory,
        tags,
        source_type,
        external_url,
        external_source,
        status,
        is_breaking,
        is_featured,
        is_trending,
        is_editor_pick,
        priority,
        editor_notes,
        content_type,
        language,
        reading_level,
        allow_comments,
        allow_sharing,
        allow_bookmarking,
        meta_title: meta_title || title,
        meta_description: meta_description || excerpt,
        meta_keywords,
        canonical_url,
        og_title: og_title || title,
        og_description: og_description || excerpt,
        og_image_url: og_image_url || featured_image_url,
        twitter_title: twitter_title || title,
        twitter_description: twitter_description || excerpt,
        twitter_image_url: twitter_image_url || featured_image_url,
        word_count: wordCount,
        reading_time: readingTime,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select(`
        *,
        author:users(id, display_name, avatar_url, role),
        category:news_categories(*)
      `)
      .single();

    if (error) {
      console.error('Error creating news article:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Check for specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('slug')) {
          return NextResponse.json({ 
            success: false, 
            error: 'An article with this URL slug already exists. Please choose a different title.' 
          }, { status: 400 });
        }
        return NextResponse.json({ 
          success: false, 
          error: 'An article with this title already exists. Please choose a different title.' 
        }, { status: 400 });
      } else if (error.code === '23503') { // Foreign key constraint violation
        if (error.message.includes('category_id')) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid category selected. Please choose a valid category.' 
          }, { status: 400 });
        }
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid category or author. Please check your selections.' 
        }, { status: 400 });
      } else if (error.code === '23502') { // Not null constraint violation
        return NextResponse.json({ 
          success: false, 
          error: 'Required fields are missing. Please fill in all required information.' 
        }, { status: 400 });
      } else if (error.code === '22001') { // String data too long
        return NextResponse.json({ 
          success: false, 
          error: 'One or more fields exceed the maximum length allowed.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create news article: ${error.message}` 
      }, { status: 500 });
    }

    // Award XP for creating news article (only if published)
    if (status === 'published') {
      // Award XP for creating news article
      awardXp(userId, XP_VALUES.CREATE_NEWS_ARTICLE, "Created news article", {
        articleId: article.id,
        articleTitle: title,
        articleSlug: articleSlug
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });

      // Check if it's user's first news article and award bonus
      const { count } = await supabase
        .from('news_articles')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', userId)
        .eq('status', 'published');
      
      if (count === 1) {
        awardXp(userId, XP_VALUES.FIRST_POST, "First news article published", {
          articleId: article.id
        }).catch(() => {
          // Silently fail - XP will be handled by background processes
        });
      }
    }

    return NextResponse.json({ success: true, data: { article } }, { status: 201 });
  } catch (error) {
    console.error('Error in news POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
