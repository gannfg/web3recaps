"use client"

import { useState } from 'react'
import { QRCodeGenerator } from '@/components/qr/qr-code-generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function QRGeneratorPage() {
  const [url, setUrl] = useState('https://www.web3recap.io/promo/magazine-raffle')
  const [size, setSize] = useState(200)
  const [logoSize, setLogoSize] = useState(40)
  const [includeLogo, setIncludeLogo] = useState(true)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generator</CardTitle>
            <CardDescription>
              Generate QR codes for your Web3 Recap promo page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter URL for QR code"
                  />
                </div>
                <div>
                  <Label htmlFor="size">Size (pixels)</Label>
                  <Input
                    id="size"
                    type="number"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    min="100"
                    max="500"
                  />
                </div>
                <div>
                  <Label htmlFor="logoSize">Logo Size (pixels)</Label>
                  <Input
                    id="logoSize"
                    type="number"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    min="20"
                    max="100"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeLogo"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="includeLogo">Include Web3 Recap Logo</Label>
                </div>
                <Button 
                  onClick={() => {
                    const canvas = document.querySelector('canvas')
                    if (canvas) {
                      const link = document.createElement('a')
                      link.download = 'web3recap-qr-code.png'
                      link.href = canvas.toDataURL()
                      link.click()
                    }
                  }}
                >
                  Download QR Code
                </Button>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <QRCodeGenerator 
                  text={url}
                  size={size}
                  color={{ dark: '#000000', light: '#ffffff' }}
                  className="border-2 border-border rounded-lg p-4 bg-white"
                  logoUrl={includeLogo ? '/logo.png' : undefined}
                  logoSize={logoSize}
                />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Scan to visit: {url}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setUrl('https://www.web3recap.io/promo/magazine-raffle')}
                >
                  Magazine Raffle Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setUrl('https://www.web3recap.io/events')}
                >
                  Events Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setUrl('https://www.web3recap.io/projects')}
                >
                  Projects Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setUrl('https://www.web3recap.io/teams')}
                >
                  Teams Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
