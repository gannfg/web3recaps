import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { pagePath } = await request.json();
    
    if (!pagePath) {
      return NextResponse.json({ error: 'Page path is required' }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Get client IP and user agent
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Insert the page view
    const { error } = await supabase
      .from('page_views')
      .insert({
        page_path: pagePath,
        ip_address: ip,
        user_agent: userAgent
      });

    if (error) {
      console.error('Error tracking page view:', error);
      return NextResponse.json({ error: 'Failed to track page view' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/views:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagePath = searchParams.get('page');
    
    if (!pagePath) {
      return NextResponse.json({ error: 'Page path is required' }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Get total view count for the page
    const { count, error } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('page_path', pagePath);

    if (error) {
      console.error('Error fetching page views:', error);
      return NextResponse.json({ error: 'Failed to fetch page views' }, { status: 500 });
    }

    return NextResponse.json({ views: count || 0 });
  } catch (error) {
    console.error('Error in GET /api/views:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
