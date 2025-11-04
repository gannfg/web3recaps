import { NextRequest, NextResponse } from "next/server"
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API auth routes
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/manifest') ||
      pathname.startsWith('/api/auth/') ||
      pathname.includes('.')) {
    return NextResponse.next()
  }

  // Skip API routes (authorize inside route handlers to reduce edge latency)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Handle page routes
  // Lightweight heuristic: if auth cookies exist, treat as authenticated in middleware.
  // Actual verification happens server-side on the route/page where needed.
  const hasAccessCookie = Boolean(request.cookies.get('sb-access-token')?.value)
  const hasRefreshCookie = Boolean(request.cookies.get('sb-refresh-token')?.value)
  const hasAuthCookies = hasAccessCookie && hasRefreshCookie

  // If user is authenticated and trying to access login page, redirect to feed
  if (hasAuthCookies && pathname === '/login') {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // If route is public, allow access
  const isPublic = PUBLIC_ROUTES.includes(pathname) ||
    pathname.match(/^\/projects\/[^\/]+$/) !== null ||
    pathname.match(/^\/teams\/[^\/]+$/) !== null
  if (isPublic) {
    return NextResponse.next()
  }

  // If route is protected and user is not authenticated, redirect to login
  const isProtected = PROTECTED_ROUTES.some(route => {
    if (route === pathname) return true
    return pathname.startsWith(route + '/')
  })
  if (isProtected && !hasAuthCookies) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin routes
  if (pathname.startsWith('/admin')) {
    if (!hasAuthCookies) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // For now, allow admin access if user has session
    // You can enhance this with proper role checking later
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only run on protected route prefixes and the login page for redirect
    '/feed/:path*',
    '/profile/:path*',
    '/projects/:path*',
    '/teams/:path*',
    '/events/:path*',
    '/admin/:path*',
    '/login'
  ],
}