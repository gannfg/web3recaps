import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });

    const { data: categories, error } = await supabase
      .from('news_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching news categories:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { categories: categories || [] } });
  } catch (error) {
    console.error('Error in categories GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseServer();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });

    // Check if user has admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!userRole || userRole.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      color,
      icon,
      is_active = true,
      sort_order = 0,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Create category
    const { data: category, error } = await supabase
      .from('news_categories')
      .insert({
        name,
        slug,
        description,
        color,
        icon,
        is_active,
        sort_order,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating news category:', error);
      return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { category } }, { status: 201 });
  } catch (error) {
    console.error('Error in categories POST:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}