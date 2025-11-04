"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QrDisplayProps {
  data: string
  title?: string
  description?: string
  size?: number
}

export function QrDisplay({ data, title = "QR Code", description, size = 200 }: QrDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!canvasRef.current) return

    // Simple QR code generation (in a real app, use a proper QR library like qrcode)
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = size
    canvas.height = size

    // Clear canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, size, size)

    // Generate a simple pattern based on the data
    // In a real app, use a proper QR code library
    const gridSize = 21 // Standard QR code grid
    const cellSize = size / gridSize

    ctx.fillStyle = "#000000"

    // Create a pseudo-QR pattern based on data hash
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }

    // Generate pattern
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellHash = hash + row * gridSize + col
        if (cellHash % 3 === 0) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
        }
      }
    }

    // Add finder patterns (corners)
    const finderSize = 7 * cellSize
    const positions = [
      [0, 0],
      [gridSize - 7, 0],
      [0, gridSize - 7],
    ]

    positions.forEach(([x, y]) => {
      // Outer square
      ctx.fillRect(x * cellSize, y * cellSize, finderSize, finderSize)
      // Inner white square
      ctx.fillStyle = "#ffffff"
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize)
      // Inner black square
      ctx.fillStyle = "#000000"
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize)
    })
  }, [data, size])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(data)
      toast({
        title: "Copied!",
        description: "QR code data copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      })
    }
  }

  const downloadQR = () => {
    if (!canvasRef.current) return

    const link = document.createElement("a")
    link.download = `qr-code-${Date.now()}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  return (
    <Card className="w-fit mx-auto">
      <CardHeader className="text-center">
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <canvas ref={canvasRef} className="border rounded-lg" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground font-mono break-all">{data}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadQR}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
