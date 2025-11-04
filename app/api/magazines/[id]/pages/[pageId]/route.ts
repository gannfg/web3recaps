import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseWithUser } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; pageId: string } }
) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id
    const supabase = auth.supabase
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })

    // Check if user has permission to update magazine pages
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!userRole || !['Admin', 'Builder', 'ADMIN', 'BUILDER', 'Author', 'AUTHOR'].includes(userRole.role)) {
      return NextResponse.json({ 
        success: false, 
        error: "Insufficient permissions to update magazine pages" 
      }, { status: 403 })
    }

    const body = await request.json()
    const { page_number, page_title, image_url, page_type, sort_order } = body

    // Update magazine page
    const { data: page, error } = await supabase
      .from('magazine_pages')
      .update({
        page_number,
        page_title,
        image_url,
        page_type,
        sort_order
      })
      .eq('id', params.pageId)
      .eq('magazine_id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating magazine page:', error)
      return NextResponse.json({ success: false, error: `Failed to update magazine page: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { page } })
  } catch (error) {
    console.error('Error in PUT /api/magazines/[id]/pages/[pageId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; pageId: string } }
) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id
    const supabase = auth.supabase
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })

    // Check if user has permission to delete magazine pages
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!userRole || !['Admin', 'Builder', 'ADMIN', 'BUILDER', 'Author', 'AUTHOR'].includes(userRole.role)) {
      return NextResponse.json({ 
        success: false, 
        error: "Insufficient permissions to delete magazine pages" 
      }, { status: 403 })
    }

    // Delete magazine page
    const { error } = await supabase
      .from('magazine_pages')
      .delete()
      .eq('id', params.pageId)
      .eq('magazine_id', params.id)

    if (error) {
      console.error('Error deleting magazine page:', error)
      return NextResponse.json({ success: false, error: 'Failed to delete magazine page' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Magazine page deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/magazines/[id]/pages/[pageId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
