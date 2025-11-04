"use client"

import { useEffect, useRef } from "react"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { supabase } from "@/lib/supabase/client"

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { user, isInitialized, setUser } = useSession()
  const { execute } = useApi()
  const initializationRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)


  // Listen for auth state changes (simplified)
  useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            // Only handle SIGNED_OUT events to clear session
            if (event === 'SIGNED_OUT') {
              setUser(null)
            }
            // Don't handle SIGNED_IN here - let the API handle it
          }
        )

    return () => subscription.unsubscribe()
  }, []) // Remove dependencies to prevent re-renders

  useEffect(() => {
    // Prevent double initialization
    if (initializationRef.current || isInitialized) {
      return
    }

    initializationRef.current = true

        const initializeSession = async () => {
      
      const { setConnecting, setUser, setInitialized } = useSession.getState()
      setConnecting(true)

      try {
        // Try to get user profile from API first (simpler approach)
        const result = await execute("/api/users/me", {
          method: "GET",
          credentials: "include"
        })

            if (result.success && result.data?.user) {
              setUser(result.data.user)
        } else {
          // No user found, check if there's a Supabase session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error("Supabase session error:", sessionError)
          }

          if (session?.user) {
            console.warn("Supabase session exists but no user profile found")
          }
          
          setUser(null)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Session restoration error:", error)
        }
        setUser(null)
      } finally {
        setConnecting(false)
        setInitialized(true)
      }
    }

    // Initialize immediately (no delay needed)
    initializeSession()

    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      console.warn("Session initialization timeout - forcing initialization")
      const { setInitialized } = useSession.getState()
      setInitialized(true)
    }, 3000) // 3 second timeout

    return () => {
      clearTimeout(fallbackTimeout)
    }
  }, []) // Remove dependencies to prevent infinite loop

  // Show loading state while initializing session
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground mt-2">Initializing session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}