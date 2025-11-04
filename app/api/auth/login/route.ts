import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServer } from "@/lib/supabase/server"

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const { email, password } = bodySchema.parse(json)

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      return NextResponse.json({ success: false, error: error?.message || "Invalid credentials" }, { status: 401 })
    }

    const { session, user } = data
    const accessToken = session.access_token
    const refreshToken = session.refresh_token
    const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000
    const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))

    const res = NextResponse.json({ success: true, data: { user: { id: user.id, email: user.email } } })
    res.cookies.set(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    })
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // longer-lived
      maxAge: 60 * 60 * 24 * 60,
    })
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}


