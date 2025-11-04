import { NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

export async function POST() {
  try {
    // Clear Supabase session if possible
    const supabase = createSupabaseServer()
    if (supabase) {
      await supabase.auth.signOut()
    }
  } catch (error) {
    // Ignore errors - we still want to clear cookies
    console.log("Supabase signout error (ignored):", error)
  }

  const res = NextResponse.json({ success: true })
  
  // Clear all authentication cookies with multiple variations
  const cookiesToClear = [
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    "sb-access-token",
    "sb-refresh-token", 
    "supabase-auth-token",
    "supabase-auth-refresh-token"
  ]

  cookiesToClear.forEach(cookieName => {
    res.cookies.set(cookieName, "", { 
      httpOnly: true, 
      path: "/", 
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    })
  })

  return res
}


