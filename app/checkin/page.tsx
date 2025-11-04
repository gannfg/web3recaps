"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { QrDisplay } from "@/components/qr/qr-display"
import { QrScanner } from "@/components/qr/qr-scanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoleGate } from "@/components/auth/role-gate"
import { WalletRequiredGate } from "@/components/auth/wallet-required-gate"
import { KycRequiredGate } from "@/components/auth/kyc-required-gate"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Scan, Calendar, Flame } from "lucide-react"
import { generateDailyQrCode, validateDailyQrCode } from "@/lib/gamification"

export default function CheckinPage() {
  const { user } = useSession()
  const router = useRouter()
  const { execute } = useApi()
  const { toast } = useToast()
  const [scanMode, setScanMode] = useState<"scan" | "display">("scan")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleQrScan = async (data: string) => {
    if (!user) return

    if (validateDailyQrCode(data)) {
      // Process daily check-in
      const result = await execute("/api/checkin/daily", {
        method: "POST",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (result.success) {
        toast({
          title: "Check-in successful! 🎉",
          description: "You've earned 10 XP for your daily check-in!",
        })
      } else {
        toast({
          title: "Check-in failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Invalid QR code",
        description: "This QR code is not valid for today's check-in",
        variant: "destructive",
      })
    }
  }

  const dailyQrCode = generateDailyQrCode()

  // Show loading while session is being loaded
  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <WalletRequiredGate>
      <KycRequiredGate>
        <div className="container max-w-4xl mx-auto py-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              <QrCode className="h-8 w-8 text-primary" />
              Coworking Space Check-in
            </h1>
            <p className="text-muted-foreground">Scan the daily QR code posted at our coworking space to check in and earn XP</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Space Check-in
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={scanMode} onValueChange={(value) => setScanMode(value as typeof scanMode)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="scan" className="flex items-center gap-2">
                      <Scan className="h-4 w-4" />
                      Scan QR Code
                    </TabsTrigger>
                    <TabsTrigger value="display" className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Generate QR
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="scan" className="mt-4">
                    <QrScanner
                      onScan={handleQrScan}
                      title="Scan Space QR Code"
                      description="Scan the QR code posted at the coworking space entrance"
                    />
                  </TabsContent>

                  <TabsContent value="display" className="mt-4">
                    <RoleGate
                      requiredRole="Admin"
                      fallback={
                        <Card>
                          <CardContent className="p-6 text-center">
                            <p className="text-muted-foreground">Only admins can generate daily QR codes for the space</p>
                          </CardContent>
                        </Card>
                      }
                    >
                      <QrDisplay
                        data={dailyQrCode}
                        title="Today's Space Check-in QR"
                        description="Post this QR code at the coworking space entrance"
                      />
                    </RoleGate>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How Coworking Space Check-ins Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium">Daily QR Code</h3>
                  <p className="text-sm text-muted-foreground">A new QR code is posted at the space entrance each morning</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Scan className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium">Scan to Check In</h3>
                  <p className="text-sm text-muted-foreground">Use this app to scan the QR code when you visit the space</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Flame className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium">Earn XP & Build Streak</h3>
                  <p className="text-sm text-muted-foreground">Get 10 XP per visit and build your attendance streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </KycRequiredGate>
    </WalletRequiredGate>
  )
}
