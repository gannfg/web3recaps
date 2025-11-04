"use client"

import { useEffect, useRef } from "react"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProviderSimple({ children }: SessionProviderProps) {
  const { user, isInitialized, setUser } = useSession()
  const { execute } = useApi()
  const initializationRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization
    if (initializationRef.current || isInitialized) {
      return
    }

    initializationRef.current = true

    const initializeSession = async () => {
      console.log("Initializing session (simple version)...")
      
      const { setConnecting, setUser, setInitialized } = useSession.getState()
      setConnecting(true)

      try {
        // Try to get user profile from API
        const result = await execute("/api/users/me", {
          method: "GET",
          credentials: "include"
        })

        if (result.success && result.data?.user) {
          console.log("User found:", result.data.user)
          setUser(result.data.user)
        } else {
          console.log("No user found")
          setUser(null)
        }
      } catch (error) {
        console.error("Session initialization error:", error)
        setUser(null)
      } finally {
        setConnecting(false)
        setInitialized(true)
      }
    }

    // Initialize immediately
    initializeSession()
  }, [])

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
