"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Users, Code, Star, BookOpen, Gift, ArrowRight, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function MagazineRafflePage() {
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [views, setViews] = useState<number>(0)

  useEffect(() => {
    // Track page view and fetch count
    const trackAndFetch = async () => {
      try {
        // Track the page view
        await fetch('/api/views', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pagePath: '/promo/magazine-raffle'
          }),
        });

        // Fetch updated view count
        const response = await fetch('/api/views?page=/promo/magazine-raffle');
        if (response.ok) {
          const data = await response.json();
          setViews(data.views || 0);
        }
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    trackAndFetch();
  }, [])
  return (
    <div className="min-h-screen bg-background w-full flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background Design Elements */}
      <div className="absolute top-10 right-10 opacity-10">
        <Image src="/logo.png" alt="Web3 Recap Logo" width={200} height={100} className="rotate-12" />
      </div>
      
      {/* Falling USDC 3D Background Elements */}
      <div className="absolute top-20 left-20 opacity-5 animate-pulse">
        <Image src="/usdc3d.png" alt="USDC" width={80} height={80} className="rotate-12" />
      </div>
      <div className="absolute top-40 right-32 opacity-5 animate-pulse" style={{animationDelay: '1s'}}>
        <Image src="/usdc3d.png" alt="USDC" width={60} height={60} className="rotate-45" />
      </div>
      <div className="absolute top-60 left-1/3 opacity-5 animate-pulse" style={{animationDelay: '2s'}}>
        <Image src="/usdc3d.png" alt="USDC" width={70} height={70} className="rotate-90" />
      </div>
      <div className="absolute top-80 right-20 opacity-5 animate-pulse" style={{animationDelay: '3s'}}>
        <Image src="/usdc3d.png" alt="USDC" width={50} height={50} className="rotate-30" />
      </div>
      <div className="absolute top-96 left-16 opacity-5 animate-pulse" style={{animationDelay: '4s'}}>
        <Image src="/usdc3d.png" alt="USDC" width={90} height={90} className="rotate-60" />
      </div>
      <div className="absolute top-32 right-1/3 opacity-5 animate-pulse" style={{animationDelay: '5s'}}>
        <Image src="/usdc3d.png" alt="USDC" width={65} height={65} className="rotate-15" />
      </div>
      <div className="absolute top-72 left-1/2 opacity-5 animate-pulse" style={{animationDelay: '6s'}}>
        <Image src="/usdc3d.png" alt="USDC" width={55} height={55} className="rotate-75" />
      </div>
      <div className="absolute top-48 right-16 opacity-5 animate-pulse" style={{animationDelay: '7s'}}>
        <Image src="/usdc3d.png" alt="USDC" width={75} height={75} className="rotate-120" />
      </div>
      
      {/* Center Logo */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-30 z-0">
        <Image src="/logo.png" alt="Web3 Recap Logo" width={400} height={200} className="rotate-6" />
      </div>
      
      {/* Left Column - Competition Details */}
      <div className="w-full lg:w-1/2 p-6 lg:p-8 flex flex-col justify-center relative z-10 overflow-hidden">
        {/* Magazine Corner Stamps */}
        <div className="absolute top-4 right-4 transform rotate-12">
          <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-white shadow-lg">
            EXCLUSIVE
          </div>
        </div>
        <div className="absolute top-12 right-8 transform -rotate-6">
          <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-lg">
            LIMITED
          </div>
        </div>
        
        {/* Magazine Issue Number */}
        <div className="absolute top-4 left-4">
          <div className="bg-black/20 text-white text-xs font-mono px-2 py-1 rounded">
            ISSUE #001
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto relative">
          {/* Magazine Header */}
          <div className="text-center mb-6">
            <div className="text-xs text-muted-foreground font-mono tracking-widest mb-2">WEB3 RECAP MAGAZINE</div>
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mb-4"></div>
          </div>
          
          {/* Main Title with Magazine Style */}
          <div className="relative mb-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-2 leading-tight text-center">
              <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-500 bg-clip-text text-transparent">
                MAGAZINE
              </span>
              <br />
              <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                RAFFLE
              </span>
            </h1>
            <div className="absolute -top-2 -right-2 transform rotate-12">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm font-black px-3 py-1 rounded-full border-2 border-white shadow-xl">
                $100 USDC
              </div>
            </div>
          </div>
          
          {/* Prize Stamp */}
          <div className="relative mb-8">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 border-4 border-white rounded-2xl p-6 shadow-2xl transform rotate-1">
              <div className="text-center relative">
                <div className="absolute -top-3 -right-3">
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white transform rotate-12">
                    PRIZE
                  </div>
                </div>
                <div className="text-6xl md:text-7xl font-black text-white mb-2 drop-shadow-lg">
                  $100
                </div>
                <div className="text-xl text-white/90 mb-1 font-bold">USDC PRIZE</div>
                <div className="text-sm text-white/80 font-semibold">2 WINNERS SELECTED</div>
                <div className="absolute -bottom-2 -left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full border-2 border-white transform -rotate-12">
                  GUARANTEED
                </div>
              </div>
            </div>
          </div>
          
          {/* Combined Magazine Info & Entry */}
          <div className="bg-card rounded-2xl p-6 border">
            <div className="text-center mb-6">
              <p className="text-lg text-foreground leading-relaxed mb-4">
                Scan the QR code in your <span className="font-bold text-primary">October magazine</span> to enter our exclusive raffle
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="w-5 h-5 mr-3" />
                  <span className="font-semibold">Available November 1st</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <BookOpen className="w-5 h-5 mr-3" />
                  <span className="font-semibold">200 Exclusive Copies</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-bold text-card-foreground mb-3 text-center">How to Enter</h3>
              <p className="text-base text-muted-foreground text-center leading-relaxed">
                To enter the draw, all you need is an account and an issue of 
                <span className="font-bold text-primary"> Web3Recap magazine</span>
              </p>
              <div className="text-sm text-muted-foreground text-center mt-2">
                Scan the QR code inside your magazine to enter!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Website Information */}
      <div className="w-full lg:w-1/2 p-6 lg:p-8 flex flex-col justify-center relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Platform Title with Logo */}
          <div className="flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="Web3 Recap Logo" width={120} height={60} className="mr-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Web3 Recap
            </h2>
          </div>
          
          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed text-center">
            Join the premier Web3 community platform for Web3 builders
          </p>
          
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-xl p-4 border hover:shadow-md transition-shadow">
              <Users className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-card-foreground mb-1">Find Teams</h3>
              <p className="text-muted-foreground text-xs">Connect with like-minded builders</p>
            </div>
            
            <div className="bg-card rounded-xl p-4 border hover:shadow-md transition-shadow">
              <Code className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-card-foreground mb-1">Create Projects</h3>
              <p className="text-muted-foreground text-xs">Showcase your Web3 projects</p>
            </div>
            
            <div className="bg-card rounded-xl p-4 border hover:shadow-md transition-shadow">
              <Star className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-card-foreground mb-1">Get Featured</h3>
              <p className="text-muted-foreground text-xs">Earn featured spots in our catalog</p>
            </div>
            
            <div className="bg-card rounded-xl p-4 border hover:shadow-md transition-shadow">
              <BookOpen className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-card-foreground mb-1">Stay Updated</h3>
              <p className="text-muted-foreground text-xs">Get the latest Web3 news</p>
            </div>
          </div>
          
          {/* Platform Features List */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-primary mr-3" />
              <span className="text-sm">Gamified Experience with XP & Achievements</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-primary mr-3" />
              <span className="text-sm">Event Management & Networking</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-primary mr-3" />
              <span className="text-sm">News Platform & Content Creation</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-primary mr-3" />
              <span className="text-sm">Project Showcase & Collaboration</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-primary mr-3" />
              <span className="text-sm">Solana Ecosystem Focus</span>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="text-center">
            <Button 
              size="lg" 
              className="w-full px-6 py-4 text-lg mb-3"
              onClick={() => setIsSignupOpen(true)}
            >
              Create Account & Enter Raffle
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground">
              Join thousands of Web3 builders already on the platform
            </p>
          </div>
        </div>
      </div>

      {/* Signup Modal */}
      <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              Create Account & Enter Raffle
            </DialogTitle>
            <p className="text-center text-muted-foreground text-sm">
              Join Web3 Recap and enter our exclusive magazine raffle
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Gift className="w-5 h-5 text-primary mr-2" />
                <span className="font-semibold text-sm">Raffle Entry Included!</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Creating an account automatically enters you into our $100 USD raffle
              </p>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              disabled={isLoading || !email || !password || password !== confirmPassword}
              onClick={async () => {
                setIsLoading(true)
                
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
                  
                  if (!json.success) {
                    throw new Error(json.error || "Sign-up failed")
                  }
                  
                  // Success - show confirmation and close modal
                  setNotification({
                    type: 'success',
                    message: 'Account created! Check your inbox to confirm your email and complete your raffle entry.'
                  })
                  setIsSignupOpen(false)
                  
                  // Reset form
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                  
                  // Redirect to news page after 2 seconds
                  setTimeout(() => {
                    window.location.href = '/news'
                  }, 2000)
                  
                  // Auto-hide notification after 5 seconds
                  setTimeout(() => setNotification(null), 5000)
                  
                } catch (err) {
                  setNotification({
                    type: 'error',
                    message: err instanceof Error ? err.message : "Sign-up failed"
                  })
                  
                  // Auto-hide error notification after 5 seconds
                  setTimeout(() => setNotification(null), 5000)
                } finally {
                  setIsLoading(false)
                }
              }}
            >
              {isLoading ? "Creating Account..." : "Create Account & Enter Raffle"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
          <div className={`rounded-lg border shadow-lg p-4 max-w-sm ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">
                  {notification.type === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className="text-sm mt-1">
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setNotification(null)}
                  className={`inline-flex rounded-md p-1.5 ${
                    notification.type === 'success' 
                      ? 'text-green-500 hover:bg-green-100' 
                      : 'text-red-500 hover:bg-red-100'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Center Views Counter (local-only) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="px-4 py-2 rounded-full border bg-background/80 backdrop-blur text-xs text-muted-foreground shadow-sm">
          <span className="font-semibold text-foreground">Views:</span> {views.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
