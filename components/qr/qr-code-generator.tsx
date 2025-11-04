'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import Image from 'next/image'

interface QRCodeGeneratorProps {
  text: string
  size?: number
  className?: string
  color?: {
    dark?: string
    light?: string
  }
  logoUrl?: string
  logoSize?: number
}

export function QRCodeGenerator({ 
  text, 
  size = 200, 
  className = '',
  color = { dark: '#000000', light: '#ffffff' },
  logoUrl,
  logoSize = 40
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      // Calculate logo size as percentage of QR code size (max 20% to maintain scannability)
      const maxLogoSize = Math.min(logoSize, size * 0.2)
      
      QRCode.toCanvas(canvasRef.current, text, {
        width: size,
        color: color,
        margin: 2,
        errorCorrectionLevel: 'H' // High error correction allows for logo overlay
      }).then(() => {
        // Add logo overlay if provided
        if (logoUrl && canvasRef.current) {
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const img = new window.Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              // Calculate center position
              const centerX = canvas.width / 2
              const centerY = canvas.height / 2
              const logoX = centerX - maxLogoSize / 2
              const logoY = centerY - maxLogoSize / 2
              
              // Draw white background circle for logo (slightly larger than logo)
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.arc(centerX, centerY, maxLogoSize / 2 + 6, 0, 2 * Math.PI)
              ctx.fill()
              
              // Draw black border around white circle
              ctx.strokeStyle = '#000000'
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.arc(centerX, centerY, maxLogoSize / 2 + 6, 0, 2 * Math.PI)
              ctx.stroke()
              
              // Draw logo
              ctx.drawImage(img, logoX, logoY, maxLogoSize, maxLogoSize)
            }
            img.onerror = () => {
              console.log('Logo failed to load, drawing text instead')
              // Fallback: draw text if logo fails to load
              const centerX = canvas.width / 2
              const centerY = canvas.height / 2
              
              // Draw white background circle
              ctx.fillStyle = '#ffffff'
              ctx.beginPath()
              ctx.arc(centerX, centerY, maxLogoSize / 2 + 6, 0, 2 * Math.PI)
              ctx.fill()
              
              // Draw black border
              ctx.strokeStyle = '#000000'
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.arc(centerX, centerY, maxLogoSize / 2 + 6, 0, 2 * Math.PI)
              ctx.stroke()
              
              // Draw text
              ctx.fillStyle = '#000000'
              ctx.font = `bold ${Math.max(8, maxLogoSize / 4)}px Arial`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText('W3R', centerX, centerY)
            }
            img.src = logoUrl
          }
        }
      }).catch(console.error)
    }
  }, [text, size, color, logoUrl, logoSize])

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className={className}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  )
}

// Simple QR code component for banners
export function BannerQRCode({ 
  url, 
  size = 120,
  className = '',
  logoUrl = '/logo.png',
  logoSize = 30
}: { 
  url: string
  size?: number
  className?: string
  logoUrl?: string
  logoSize?: number
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <QRCodeGenerator 
        text={url}
        size={size}
        color={{ dark: '#000000', light: '#ffffff' }}
        className="rounded-lg border-2 border-border shadow-lg bg-background p-2"
        logoUrl={logoUrl}
        logoSize={logoSize}
      />
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Scan to enter raffle
      </p>
    </div>
  )
}
