import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServer } from "@/lib/supabase/server"

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const { email, password } = bodySchema.parse(json)

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Clear any existing session before registration
    try {
      await supabase.auth.signOut()
      console.log("Cleared existing Supabase session before registration")
    } catch (error) {
      // Ignore errors - we just want to ensure clean state
      console.log("Pre-registration signout (ignored):", error)
    }
    
    // Add a small delay to ensure session clearing completes
    await new Promise(resolve => setTimeout(resolve, 50))

    // Derive a safe production URL for email redirects
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const baseFromHeaders = forwardedHost ? `${forwardedProto}://${forwardedHost}` : ''
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || baseFromHeaders || 'https://www.web3recap.io'
    
    console.log('Auth redirect URL:', baseUrl)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: baseUrl ? `${baseUrl}/auth/confirmed` : undefined,
      },
    })
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // Note: User profile will be automatically created by database trigger
    // when the user confirms their email and the auth.users record is finalized
    if (data.user) {
      console.log('User registration initiated for:', data.user.id)
      console.log('Profile will be created automatically after email confirmation')
    }

    return NextResponse.json({ success: true, data: { email } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}


