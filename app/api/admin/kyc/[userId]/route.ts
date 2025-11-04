import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServer } from "@/lib/supabase/server"

const kycActionSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: "Action must be 'approve' or 'reject'" })
  }),
  rejectionReason: z.string().optional()
})

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

// PATCH /api/admin/kyc/[userId] - Approve or reject KYC submission
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params
    const body = await request.json()
    
    // Validate request body
    let validatedData
    try {
      validatedData = kycActionSchema.parse(body)
    } catch (error) {
      console.error("KYC action validation error:", error)
      const message = error instanceof Error ? error.message : "Validation failed"
      return NextResponse.json({ success: false, error: `Validation failed: ${message}` }, { status: 400 })
    }

    const { action, rejectionReason } = validatedData

    // Check if target user exists and has KYC submission
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        display_name,
        kyc_status,
        kyc_verified,
        kyc_document_url,
        kyc_document_type,
        kyc_full_name
      `)
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (!targetUser.kyc_document_url) {
      return NextResponse.json({ success: false, error: "User has no KYC submission" }, { status: 400 })
    }

    if (targetUser.kyc_status === 'verified') {
      return NextResponse.json({ success: false, error: "KYC already verified" }, { status: 400 })
    }

    if (targetUser.kyc_status === 'rejected' && action === 'reject') {
      return NextResponse.json({ success: false, error: "KYC already rejected" }, { status: 400 })
    }

    // Prepare update data based on action
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (action === 'approve') {
      updateData = {
        ...updateData,
        kyc_verified: true,
        kyc_status: 'verified',
        kyc_verified_at: new Date().toISOString(),
        kyc_verified_by: user.id,
        role: 'STUDENT', // Auto-promote to Student role
        kyc_completed: true
      }
    } else if (action === 'reject') {
      updateData = {
        ...updateData,
        kyc_status: 'rejected',
        kyc_verified: false
      }
      
      // Store rejection reason if provided
      if (rejectionReason) {
        updateData.kyc_rejection_reason = rejectionReason
      }
    }

    // Update user record
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(`
        id,
        display_name,
        kyc_completed,
        kyc_verified,
        kyc_status,
        kyc_document_type,
        kyc_full_name,
        kyc_submitted_at,
        kyc_verified_at,
        kyc_verified_by,
        role
      `)
      .single()

    if (updateError) {
      console.error("Error updating KYC status:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update KYC status" }, { status: 500 })
    }

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 })
    }

    console.log(`KYC ${action}d for user ${userId} by admin ${user.id}`)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          displayName: updatedUser.display_name,
          kycCompleted: updatedUser.kyc_completed,
          kycVerified: updatedUser.kyc_verified,
          kycStatus: updatedUser.kyc_status,
          kycDocumentType: updatedUser.kyc_document_type,
          kycFullName: updatedUser.kyc_full_name,
          kycSubmittedAt: updatedUser.kyc_submitted_at,
          kycVerifiedAt: updatedUser.kyc_verified_at,
          kycVerifiedBy: updatedUser.kyc_verified_by,
          role: updatedUser.role
        }
      },
      message: `KYC ${action}d successfully`
    })

  } catch (error) {
    console.error("Admin KYC action error:", error)
    const message = error instanceof Error ? error.message : "Failed to process KYC action"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
