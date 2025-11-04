import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseWithUser } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'published'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('magazines')
      .select(`
        *,
        magazine_pages (
          id,
          page_number,
          page_title,
          image_url,
          page_type,
          sort_order
        )
      `)
      .order('issue_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: magazines, error } = await query

    if (error) {
      console.error('Error fetching magazines:', error)
      return NextResponse.json({ error: 'Failed to fetch magazines' }, { status: 500 })
    }

    // Sort pages by sort_order for each magazine
    const sortedMagazines = magazines?.map(magazine => ({
      ...magazine,
      magazine_pages: magazine.magazine_pages?.sort((a: any, b: any) => a.sort_order - b.sort_order)
    }))

    return NextResponse.json({ success: true, data: { magazines: sortedMagazines } })
  } catch (error) {
    console.error('Error in GET /api/magazines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Check if user has permission to create magazines
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    console.log('User ID:', userId);
    console.log('User role from database:', userRole);
    console.log('Role check:', userRole?.role, 'in', ['Admin', 'Builder', 'ADMIN', 'BUILDER', 'Author', 'AUTHOR']);

    if (!userRole || !['Admin', 'Builder', 'ADMIN', 'BUILDER', 'Author', 'AUTHOR'].includes(userRole.role)) {
      console.log('Permission denied for user:', userId, 'with role:', userRole?.role);
      return NextResponse.json({ 
        success: false, 
        error: "Insufficient permissions to create magazines" 
      }, { status: 403 });
    }

    console.log('Creating magazine for user:', userId, 'with role:', userRole.role);

    const body = await request.json();
    const { title, description, issue_number, issue_date, status = 'draft' } = body;

    // Validate required fields
    if (!title || !issue_number || !issue_date) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: title, issue_number, issue_date' 
      }, { status: 400 });
    }

    // Create magazine
    const { data: magazine, error } = await supabase
      .from('magazines')
      .insert({
        title,
        description,
        issue_number,
        issue_date,
        status,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating magazine:', error);
      return NextResponse.json({ success: false, error: 'Failed to create magazine' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { magazine } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/magazines:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
