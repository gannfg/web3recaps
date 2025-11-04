"use client"

import { ReactNode } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWalletConnection } from "@/hooks/use-wallet-connection"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, AlertCircle } from "lucide-react"

interface WalletRequiredGateProps {
  children: ReactNode
  fallback?: ReactNode
}

export function WalletRequiredGate({ children, fallback }: WalletRequiredGateProps) {
  const { connected, connecting, publicKey } = useWallet()
  const { saveWalletAddress } = useWalletConnection()

  // Show loading state while connecting
  if (connecting) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Connecting wallet...</p>
        </div>
      </div>
    )
  }

  // If wallet is connected, show children
  if (connected) {
    return <>{children}</>
  }

  // If fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Default wallet connection prompt
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Wallet Connection Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              You need to connect your wallet to access this feature.
            </p>
            <p className="text-sm text-muted-foreground">
              Connect your Solana wallet to continue with KYC verification.
            </p>
          </div>
          
          <div className="space-y-3">
            {!publicKey ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your Solana wallet to continue
                </p>
                <WalletMultiButton className="!w-full !h-10" />
                <div className="text-xs text-muted-foreground">
                  <p>Supported wallets: Phantom, Backpack, Solflare</p>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => saveWalletAddress(publicKey.toString())} 
                className="w-full"
                disabled={connecting}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Save Wallet Address
              </Button>
            )}
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Why do I need to connect my wallet?</p>
                <p>Wallet connection is required for KYC verification and accessing coworking space features.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
