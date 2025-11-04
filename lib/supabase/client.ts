import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client for browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence on client
    autoRefreshToken: true,
    detectSessionInUrl: true, // Handle auth callbacks
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'web3recap'
    }
  }
})

// Auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  
  // Handle session changes
})
