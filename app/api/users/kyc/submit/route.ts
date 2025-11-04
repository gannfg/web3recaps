import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServer } from "@/lib/supabase/server"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"

const kycSubmitSchema = z.object({
  documentUrl: z.string().url("Invalid document URL"),
  documentType: z.enum(['passport', 'drivers_license', 'national_id', 'ktp'], {
    errorMap: () => ({ message: "Invalid document type" })
  }),
  fullName: z.string().min(2, "Full name must be at least 2 characters")
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

// POST /api/users/kyc/submit - Submit KYC document
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    let validatedData
    try {
      validatedData = kycSubmitSchema.parse(body)
    } catch (error) {
      console.error("KYC submission validation error:", error)
      const message = error instanceof Error ? error.message : "Validation failed"
      return NextResponse.json({ success: false, error: `Validation failed: ${message}` }, { status: 400 })
    }

    const { documentUrl, documentType, fullName } = validatedData

    // Check if user already has a pending or verified KYC submission
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('kyc_status, kyc_verified')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error("Error fetching user KYC status:", fetchError)
      return NextResponse.json({ success: false, error: "Failed to check existing KYC status" }, { status: 500 })
    }

    // Allow re-submission only if previous submission was rejected
    if (existingUser?.kyc_status === 'pending') {
      return NextResponse.json({ 
        success: false, 
        error: "You already have a KYC submission pending review" 
      }, { status: 400 })
    }

    if (existingUser?.kyc_verified === true) {
      return NextResponse.json({ 
        success: false, 
        error: "Your KYC has already been verified" 
      }, { status: 400 })
    }

    // Update user record with KYC information
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        kyc_document_url: documentUrl,
        kyc_document_type: documentType,
        kyc_full_name: fullName,
        kyc_submitted_at: new Date().toISOString(),
        kyc_status: 'pending',
        kyc_verified: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select(`
        id,
        display_name,
        kyc_completed,
        kyc_verified,
        kyc_status,
        kyc_document_type,
        kyc_document_url,
        kyc_full_name,
        kyc_submitted_at,
        kyc_verified_at,
        kyc_verified_by
      `)
      .single()

    if (updateError) {
      console.error("Error updating user KYC:", updateError)
      return NextResponse.json({ success: false, error: "Failed to submit KYC" }, { status: 500 })
    }

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    console.log("KYC submitted successfully for user:", user.id)

    // Award XP for submitting KYC
    awardXp(user.id, XP_VALUES.COMPLETE_PROFILE, "Submitted KYC documents", {
      documentType,
      submittedAt: new Date().toISOString()
    }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

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
          kycDocumentUrl: updatedUser.kyc_document_url,
          kycFullName: updatedUser.kyc_full_name,
          kycSubmittedAt: updatedUser.kyc_submitted_at,
          kycVerifiedAt: updatedUser.kyc_verified_at,
          kycVerifiedBy: updatedUser.kyc_verified_by
        }
      },
      message: "KYC submitted successfully. Your documents are under review."
    })

  } catch (error) {
    console.error("KYC submission error:", error)
    const message = error instanceof Error ? error.message : "Failed to submit KYC"
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
