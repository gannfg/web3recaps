import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }

    const { layout_position } = await request.json();
    const articleSlug = params.slug;

    if (!articleSlug) {
      return NextResponse.json({ success: false, error: "Article slug is required" }, { status: 400 });
    }

    console.log('Layout API called with articleSlug:', articleSlug, 'layout_position:', layout_position);

    // Update the article's layout position using slug
    const { data, error } = await supabase
      .from('news_articles')
      .update({ 
        layout_position: layout_position || null,
        updated_at: new Date().toISOString()
      })
      .eq('slug', articleSlug)
      .select()
      .single();

    if (error) {
      console.error('Error updating article layout:', error);
      return NextResponse.json({ success: false, error: 'Failed to update article layout' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: { article: data },
      message: 'Article layout position updated successfully' 
    });

  } catch (error) {
    console.error('Error in layout PATCH:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
