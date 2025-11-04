import type React from "react"

export default function PromoLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-background">
      <style dangerouslySetInnerHTML={{
        __html: `
          header {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: none !important;
          }
          nav[class*="mobile"] {
            display: none !important;
          }
          nav[class*="bottom"] {
            display: none !important;
          }
          .sticky {
            position: static !important;
          }
          [data-sticky] {
            position: static !important;
          }
          [class*="mobile-bottom"] {
            display: none !important;
          }
          [class*="bottom-nav"] {
            display: none !important;
          }
          main {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .container {
            max-width: none !important;
            padding: 0 !important;
          }
          /* Target any fixed positioned bottom elements */
          [style*="position: fixed"][style*="bottom"] {
            display: none !important;
          }
          /* Target any absolute positioned bottom elements */
          [style*="position: absolute"][style*="bottom"] {
            display: none !important;
          }
        `
      }} />
      {children}
    </div>
  )
}
