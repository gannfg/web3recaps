"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthConfirmedPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [finalized, setFinalized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash)
    // Supabase may provide hash tokens or a code query param
    const access_token = params.get("access_token") || undefined
    const refresh_token = params.get("refresh_token") || undefined
    const expires_at = params.get("expires_at") || undefined
    const code = search.get("code") || undefined

    if (!access_token && !refresh_token && !code) {
      setFinalized(true)
      return
    }

    const finalize = async () => {
      try {
        console.log("Finalizing session with:", { 
          access_token: access_token ? "present" : "missing", 
          refresh_token: refresh_token ? "present" : "missing", 
          code: code ? "present" : "missing" 
        })
        
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ access_token, refresh_token, expires_at, code })
        })
        
        console.log("Session response status:", res.status)
        console.log("Session response headers:", Object.fromEntries(res.headers.entries()))
        
        if (!res.ok) {
          const text = await res.text()
          console.error("Session response error:", text)
          throw new Error(`Server error: ${res.status} ${res.statusText}`)
        }
        
        const json = await res.json()
        console.log("Session response JSON:", json)
        
        if (!json.success) throw new Error(json.error || "Failed to finalize session")
        setFinalized(true)
        // Redirect to profile after 2 seconds
        setTimeout(() => {
          router.replace("/profile")
        }, 2000)
      } catch (e) {
        console.error("Session finalization error:", e)
        setError(e instanceof Error ? e.message : "Unknown error")
      }
    }

    finalize()
  }, [router, search])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-2xl font-semibold">You're all set!</h1>
        <p className="mt-2 text-muted-foreground">
          {finalized ? "Your email has been confirmed and your session is active." : "Finalizing your session..."}
        </p>
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
        <div className="mt-6 flex gap-3 justify-center">
          <Button asChild>
            <Link href="/feed">Go to Feed</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}


