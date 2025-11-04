"use client"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/store/useSession"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, clearSession } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const returnTo = searchParams.get('redirect') || searchParams.get('returnTo') || '/feed'

  // Don't aggressively clear sessions - let the user stay logged in if they are

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Login failed")
      
      // Fetch complete user profile after successful login
      const profileRes = await fetch("/api/users/me", { 
        method: "GET", 
        credentials: "include" 
      })
      const profileJson = await profileRes.json()
      
      if (profileJson.success && profileJson.data?.user) {
        setUser(profileJson.data.user)
      } else {
        // Fallback to basic user data if profile fetch fails
        setUser({ id: json.data.user.id, email: json.data.user.email, role: "Visitor", totalXp: 0, rank: "Newcomer", level: 1, onboardingCompleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any)
      }
      
      console.log("Login successful, redirecting to:", returnTo)
      
      // Use window.location.href for a full page reload to ensure middleware sees the session
      // This ensures the middleware can properly detect the authenticated state
      window.location.href = returnTo
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError(null)
    setLoading(true)
    
    try {
      const res = await fetch("/api/auth/register", { 
        method: "POST", 
        headers: { 
          "Content-Type": "application/json"
        }, 
        body: JSON.stringify({ email, password }),
        credentials: "include"
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Sign-up failed")
      alert("Check your inbox to confirm your email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Sign in</h1>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          <Button type="button" variant="outline" onClick={handleSignUp} disabled={loading}>Sign up</Button>
        </div>
      </form>
    </div>
  )
}


