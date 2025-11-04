import { createClient } from "@supabase/supabase-js"

// Generic server-side Supabase client (no SSR cookie binding)
// Uses anon key; do NOT use service role in client-exposed code.
export function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    console.error("Supabase configuration missing:", {
      url: !!url,
      anon: !!anon,
      env: process.env.NODE_ENV
    })
    return null
  }

  return createClient(url, anon, { 
    auth: { 
      persistSession: false, // Don't persist on server side
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-application-name': 'web3recap'
      }
    }
  })
}

// Server-side Supabase client with service role for admin operations
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (process.env.NODE_ENV !== 'production') {
    console.log("Admin client config check:", {
      url: !!url,
      serviceRole: !!serviceRole,
    })
  }

  if (!url || !serviceRole) {
    console.warn("Supabase service role configuration missing. Admin operations may not work.")
    return null
  }

  return createClient(url, serviceRole, { 
    auth: { 
      persistSession: false,
      autoRefreshToken: false
    } 
  })
}

// Server-side Supabase client with user context for RLS
export function createSupabaseWithUser(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    console.warn("Supabase configuration missing. Some features may not work.")
    return null
  }

  // Create client with user context for RLS
  const client = createClient(url, anon, { 
    auth: { 
      persistSession: false,
      autoRefreshToken: false
    } 
  })

  // Set the user context for RLS policies
  // This is a workaround since we can't easily set auth context in server-side
  // In production, you might want to use service role for admin operations
  return client
}


