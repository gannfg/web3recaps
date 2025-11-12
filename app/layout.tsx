import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { HeaderNav } from "@/components/navigation/header-nav"
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav"
import { WalletContextProvider } from "@/components/wallet/wallet-context-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { MagazineBarWrapper } from "@/components/news/magazine-bar-wrapper"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: {
    default: "WEB3RECAP",
    template: "%s · WEB3RECAP",
  },
  description: "Daily recap for Web3 builders: news, events, projects, and community.",
  applicationName: "WEB3RECAP",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "WEB3RECAP",
    description: "Daily recap for Web3 builders: news, events, projects, and community.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://web3recap.io",
    siteName: "WEB3RECAP",
    images: [{ url: "/logo.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WEB3RECAP",
    description: "Daily recap for Web3 builders: news, events, projects, and community.",
    images: ["/logo.png"],
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eae9e9" },
    { media: "(prefers-color-scheme: dark)", color: "#eae9e9" },
  ],
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} overflow-x-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true} disableTransitionOnChange>
          <WalletContextProvider>
            <SessionProvider>
              <Suspense fallback={null}>
                <HeaderNav />
              </Suspense>
              
              {/* Magazine banner temporarily disabled - magazine not ready yet */}
              {/* <Suspense fallback={null}>
                <MagazineBarWrapper />
              </Suspense> */}

              <main className="min-h-screen bg-background pb-16 md:pb-0 relative pt-12">
                <div className="container mx-auto px-4 py-2 max-w-full overflow-x-hidden static">
                  {children}
                </div>
              </main>

              <Suspense fallback={null}>
                <MobileBottomNav />
              </Suspense>

              {process.env.NODE_ENV === 'production' && <Analytics />}
            </SessionProvider>
          </WalletContextProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Suppress development console messages
                (function() {
                  const suppressMessages = [
                    'Download the React DevTools',
                    '[Vercel Web Analytics]',
                    'react-dom.development.js'
                  ];
                  
                  ['log', 'warn', 'info', 'debug'].forEach(method => {
                    const original = console[method];
                    console[method] = function(...args) {
                      const message = args.join(' ');
                      if (suppressMessages.some(msg => message.includes(msg))) {
                        return;
                      }
                      original.apply(console, args);
                    };
                  });
                })();
              `,
            }}
          />
        )}
      </body>
    </html>
  )
}
