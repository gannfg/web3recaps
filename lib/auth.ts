import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServer } from "./supabase/server"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

export interface AuthSession {
  user: {
    id: string
    email: string
    [key: string]: any
  }
  supabase: any
}

/**
 * Get authenticated session from request cookies
 * Used in middleware and API routes
 */
export async function getSessionFromRequest(request: NextRequest): Promise<AuthSession | null> {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (!accessToken || !refreshToken) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase configuration missing")
    return null
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    return { 
      user: {
        ...user,
        email: user.email || ""
      }, 
      supabase 
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

/**
 * Get authenticated client for API routes
 * This is the standardized version that should replace the individual getAuthedClient functions
 */
export async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  
  if (!supabase || !access || !refresh) {
    return { supabase: null, user: null }
  }
  
  try {
    await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { supabase: null, user: null }
    }
    
    return { supabase, user }
  } catch (error) {
    console.error('Auth client error:', error)
    return { supabase: null, user: null }
  }
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: any, requiredRole: string): boolean {
  if (!user) return false
  
  const roleHierarchy: Record<string, number> = {
    'Visitor': 0,
    'Student': 1,
    'Builder': 2,
    'Author': 2,
    'Admin': 3
  }

  const normalize = (role?: string) => {
    const upper = (role || '').toUpperCase()
    switch (upper) {
      case 'VISITOR': return 'Visitor'
      case 'STUDENT': return 'Student'
      case 'BUILDER': return 'Builder'
      case 'AUTHOR': return 'Author'
      case 'ADMIN': return 'Admin'
      default: return 'Visitor'
    }
  }

  const userRoleLevel = roleHierarchy[normalize(user.role)] ?? 0
  const requiredRoleLevel = roleHierarchy[normalize(requiredRole)] ?? 0
  return userRoleLevel >= requiredRoleLevel
}

/**
 * Routes that require authentication
 */
export const PROTECTED_ROUTES = [
  '/profile',
  '/checkin',
  '/events',
  '/teams',
  '/projects',
  '/admin'
]

/**
 * Routes that are public (accessible without auth)
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/feed',
  '/news',
  '/showcase',
  '/auth/confirmed'
]

/**
 * API routes that require authentication
 */
export const PROTECTED_API_ROUTES = [
  '/api/posts',
  '/api/teams',
  '/api/projects',
  '/api/users/me',
  '/api/checkin',
  '/api/upload',
  '/api/admin',
  '/api/notifications',
  '/api/invitations',
  '/api/news',
  '/api/events'
]

export { ACCESS_COOKIE, REFRESH_COOKIE }

// ---------------------------------------------------------------------------
// Shared helpers for API route authentication
// ---------------------------------------------------------------------------

export async function requireUser(request: NextRequest): Promise<{ supabase: any, user: any } | { supabase: null, user: null }> {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()

  if (!supabase || !access || !refresh) {
    return { supabase: null, user: null }
  }

  try {
    await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { supabase: null, user: null }
    return { supabase, user }
  } catch {
    return { supabase: null, user: null }
  }
}
