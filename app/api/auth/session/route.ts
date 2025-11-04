import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { z } from "zod"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

const sessionSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_at: z.string().optional(),
  code: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, refresh_token, expires_at, code } = sessionSchema.parse(body)

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    let session
    
    if (access_token && refresh_token) {
      // Handle OAuth callback with tokens
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })
      
      if (error || !data.session) {
        return NextResponse.json({ success: false, error: error?.message || "Invalid session tokens" }, { status: 401 })
      }
      
      session = data.session
    } else if (code) {
      // Handle OAuth callback with code
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error || !data.session) {
        return NextResponse.json({ success: false, error: error?.message || "Invalid authorization code" }, { status: 401 })
      }
      
      session = data.session
    } else {
      return NextResponse.json({ success: false, error: "No valid session data provided" }, { status: 400 })
    }

    // Note: User profile should already exist due to database trigger
    // If it doesn't exist, it will be created by /api/users/me fallback logic

    // Set session cookies
    const accessToken = session.access_token
    const refreshToken = session.refresh_token
    const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000
    const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))

    const response = NextResponse.json({ 
      success: true, 
      data: { 
        user: { 
          id: session.user.id, 
          email: session.user.email 
        } 
      } 
    })

    response.cookies.set(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    })

    response.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 days
    })

    return response
  } catch (err) {
    console.error("Session finalization error:", err)
    const message = err instanceof Error ? err.message : "Failed to finalize session"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ success: false, error: "No session found" }, { status: 401 })
    }

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        user: { 
          id: data.session.user.id, 
          email: data.session.user.email 
        } 
      } 
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get session"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
