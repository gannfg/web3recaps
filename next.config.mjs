/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Only ignore during builds in development, enable for production
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    // Only ignore build errors in development, enable for production  
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  
  // Increase body size limit for API routes
  experimental: {
    serverComponentsExternalPackages: [],
  },
  
  images: {
    // Simplify for faster dev builds
    unoptimized: process.env.NODE_ENV === 'development',
    domains: ['placeholder.com', 'supabase.co', 'covhnjmsfmfnlrkvllah.supabase.co', 'images.unsplash.com'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox; media-src 'self' https://covhnjmsfmfnlrkvllah.supabase.co;",
  },
  
  // Configure headers for better security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig