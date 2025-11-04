import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseWithUser } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    const { data: pages, error } = await supabase
      .from('magazine_pages')
      .select('*')
      .eq('magazine_id', params.id)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching magazine pages:', error)
      return NextResponse.json({ error: 'Failed to fetch magazine pages' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { pages } })
  } catch (error) {
    console.error('Error in GET /api/magazines/[id]/pages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id
    const supabase = auth.supabase
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })

    // Check if user has permission to create magazine pages
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!userRole || !['Admin', 'Builder', 'ADMIN', 'BUILDER', 'Author', 'AUTHOR'].includes(userRole.role)) {
      return NextResponse.json({ 
        success: false, 
        error: "Insufficient permissions to create magazine pages" 
      }, { status: 403 })
    }

    const body = await request.json()
    const { page_number, page_title, image_url, page_type = 'content', sort_order } = body

    // Validate required fields
    if (!page_number || !image_url || sort_order === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: page_number, image_url, sort_order' 
      }, { status: 400 })
    }

    // Create magazine page
    const { data: page, error } = await supabase
      .from('magazine_pages')
      .insert({
        magazine_id: params.id,
        page_number,
        page_title,
        image_url,
        page_type,
        sort_order
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating magazine page:', error)
      return NextResponse.json({ success: false, error: 'Failed to create magazine page' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { page } }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/magazines/[id]/pages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
