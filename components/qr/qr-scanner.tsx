"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CameraOff, AlertCircle } from "lucide-react"

interface QrScannerProps {
  onScan: (data: string) => void
  title?: string
  description?: string
}

export function QrScanner({ onScan, title = "Scan QR Code", description }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startScanning = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera if available
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
        setHasPermission(true)

        // In a real app, you'd use a QR code scanning library here
        // For demo purposes, we'll simulate scanning after 3 seconds
        setTimeout(() => {
          const mockQrData = `obelisk-daily-${new Date().toISOString().split("T")[0]}`
          onScan(mockQrData)
          stopScanning()
        }, 3000)
      }
    } catch (err) {
      setError("Camera access denied or not available")
      setHasPermission(false)
      console.error("Camera error:", err)
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
          {isScanning ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play()
                  }
                }}
              />
              <div className="absolute inset-0 border-2 border-primary rounded-lg">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
              </div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                Scanning...
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline" className="flex items-center gap-2 bg-transparent">
              <CameraOff className="h-4 w-4" />
              Stop Scanning
            </Button>
          )}
        </div>

        {hasPermission === false && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Camera permission is required to scan QR codes. Please enable camera access in your browser settings.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
