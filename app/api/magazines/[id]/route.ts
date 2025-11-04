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
    
    const { data: magazine, error } = await supabase
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
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching magazine:', error)
      return NextResponse.json({ error: 'Magazine not found' }, { status: 404 })
    }

    // Sort pages by sort_order
    magazine.magazine_pages = magazine.magazine_pages?.sort((a: any, b: any) => a.sort_order - b.sort_order)

    return NextResponse.json({ success: true, data: { magazine } })
  } catch (error) {
    console.error('Error in GET /api/magazines/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    const userId = auth.user.id
    const supabase = auth.supabase
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Check if user has proper role
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!userRole || !['Admin', 'Builder', 'ADMIN', 'BUILDER', 'Author', 'AUTHOR'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, issue_number, issue_date, status, cover_image_url } = body

    // Update magazine
    const { data: magazine, error } = await supabase
      .from('magazines')
      .update({
        title,
        description,
        issue_number,
        issue_date,
        status,
        cover_image_url
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating magazine:', error)
      return NextResponse.json({ error: 'Failed to update magazine' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { magazine } })
  } catch (error) {
    console.error('Error in PUT /api/magazines/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete magazine (pages will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('magazines')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting magazine:', error)
      return NextResponse.json({ error: 'Failed to delete magazine' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Magazine deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/magazines/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
