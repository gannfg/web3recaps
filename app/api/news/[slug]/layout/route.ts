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
    const identifier = params.slug;

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Article identifier is required" }, { status: 400 });
    }

    console.log('Layout API called with identifier:', identifier, 'layout_position:', layout_position);

    // Check if identifier is a UUID (ID) or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

    // Update the article's layout position using ID or slug
    const { data, error } = await supabase
      .from('news_articles')
      .update({ 
        layout_position: layout_position || null,
        updated_at: new Date().toISOString()
      })
      .eq(isUUID ? 'id' : 'slug', identifier)
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
