import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User } from "@/lib/types"

interface SessionState {
  user: User | null
  isConnecting: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  setUser: (user: User | null) => void
  setConnecting: (connecting: boolean) => void
  setInitialized: (initialized: boolean) => void
  logout: () => void
  clearSession: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      isConnecting: false,
      isInitialized: false,
      get isAuthenticated() {
        return get().user !== null
      },
          setUser: (user) => {
            set({ user, isInitialized: true })
          },
      setConnecting: (isConnecting) => set({ isConnecting }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      logout: () => {
        console.log("Logging out user")
        set({ user: null, isConnecting: false })
      },
      clearSession: () => {
        console.log("Clearing session completely")
        
        // Clear Zustand persist storage FIRST
        if (typeof window !== "undefined") {
          localStorage.removeItem("obelisk-session")
          sessionStorage.removeItem("obelisk-session")
        }
        
        // Then clear the state
        set({ user: null, isConnecting: false, isInitialized: false })
        
        // Clear other auth-related keys
        if (typeof window !== "undefined") {
          const keysToRemove = [
            "obelisk-hub-data", 
            "supabase.auth.token",
            "supabase.auth.refresh-token",
            "sb-access-token",
            "sb-refresh-token"
          ]
          
          keysToRemove.forEach(key => {
            localStorage.removeItem(key)
            sessionStorage.removeItem(key)
          })
          
          // Clear cookies by calling logout endpoint
          fetch("/api/auth/logout", { 
            method: "POST", 
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }).catch(() => {}) // Ignore errors
        }
      },
    }),
    {
      name: "obelisk-session",
      partialize: (state) => ({ user: state.user }),
    },
  ),
)

// Debug helper - expose to window in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  ;(window as any).clearObeliskSession = () => {
    useSession.getState().clearSession()
    window.location.reload()
    console.log("✅ Session cleared and page reloaded")
  }
}
