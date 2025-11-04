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

// POST /api/admin/reset-kyc - Reset KYC data for a user
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    // Find user by email
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, kyc_status, kyc_document_url')
      .eq('email', email)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Reset KYC fields
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        kyc_completed: false,
        kyc_verified: false,
        kyc_status: null,
        kyc_document_url: null,
        kyc_document_type: null,
        kyc_full_name: null,
        kyc_submitted_at: null,
        kyc_verified_at: null,
        kyc_verified_by: null,
        role: 'VISITOR'
      })
      .eq('id', targetUser.id)
      .select()

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json({ success: false, error: "Failed to reset KYC data" }, { status: 500 })
    }

    // Try to delete document from storage if it exists
    if (targetUser.kyc_document_url) {
      try {
        const urlParts = targetUser.kyc_document_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const filePath = `${targetUser.id}/${fileName}`
        
        await supabase.storage
          .from('kyc-documents')
          .remove([filePath])
      } catch (storageError) {
        console.log("Note: Could not delete document from storage:", storageError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `KYC data reset successfully for ${email}`,
      data: {
        userId: targetUser.id,
        email: targetUser.email,
        previousStatus: targetUser.kyc_status
      }
    })

  } catch (error) {
    console.error("Reset KYC error:", error)
    const message = error instanceof Error ? error.message : "Failed to reset KYC data"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
