import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  if (!supabase || !access || !refresh) return { supabase: null, user: null }
  
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase: null, user: null }
  
  return { supabase, user }
}

// GET /api/admin/kyc - List KYC submissions
export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userRole || userRole.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query based on status filter
    let query = supabase
      .from('users')
      .select(`
        id,
        display_name,
        email,
        kyc_document_url,
        kyc_document_type,
        kyc_full_name,
        kyc_status,
        kyc_submitted_at,
        kyc_verified_at,
        kyc_verified_by,
        created_at
      `)
      .not('kyc_document_url', 'is', null)

    if (status !== 'all') {
      query = query.eq('kyc_status', status)
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('kyc_document_url', 'is', null)
      .eq('kyc_status', status !== 'all' ? status : undefined)

    if (countError) {
      console.error("Error getting KYC count:", countError)
      return NextResponse.json({ success: false, error: "Failed to get KYC count" }, { status: 500 })
    }

    // Get paginated results
    const { data: kycSubmissions, error: fetchError } = await query
      .order('kyc_submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error("Error fetching KYC submissions:", fetchError)
      return NextResponse.json({ success: false, error: "Failed to fetch KYC submissions" }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    // Transform data for frontend
    const transformedSubmissions = (kycSubmissions || []).map(submission => ({
      id: submission.id,
      displayName: submission.display_name,
      email: submission.email,
      documentUrl: submission.kyc_document_url,
      documentType: submission.kyc_document_type,
      fullName: submission.kyc_full_name,
      status: submission.kyc_status,
      submittedAt: submission.kyc_submitted_at,
      verifiedAt: submission.kyc_verified_at,
      verifiedBy: submission.kyc_verified_by,
      createdAt: submission.created_at
    }))

    return NextResponse.json({
      success: true,
      data: {
        submissions: transformedSubmissions,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: totalPages
        }
      }
    })

  } catch (error) {
    console.error("Admin KYC list error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch KYC submissions"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
