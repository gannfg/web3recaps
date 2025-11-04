"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { useSession } from "@/store/useSession"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { QrCode } from "lucide-react"
import type { User } from "@/lib/types"

interface CheckInButtonProps {
  user: User
}

export function CheckInButton({ user }: CheckInButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { execute } = useApi()
  const { setUser } = useSession()
  const { connected, publicKey } = useWallet()
  const [isSavingWallet, setIsSavingWallet] = useState(false)

  const hasWallet = Boolean(user.walletAddress) || connected

  // DISABLED: Save wallet address when connected
  // Wallet addresses should only be saved during checkout process
  // useEffect(() => {
  //   if (connected && publicKey && user && !user.walletAddress && !isSavingWallet) {
  //     const saveWalletAddress = async () => {
  //       setIsSavingWallet(true)
  //       try {
  //         const walletAddress = publicKey.toString()
  //         const result = await execute("/api/users/me", {
  //           method: "PATCH",
  //           headers: { 
  //             "Content-Type": "application/json",
  //             "x-user-id": user.id 
  //           },
  //           body: JSON.stringify({ walletAddress })
  //         })

  //         if (result.success && result.data) {
  //           setUser({ ...user, walletAddress })
  //           toast({
  //             title: "Wallet Connected!",
  //             description: `Connected ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`,
  //           })
  //         }
  //       } catch (error) {
  //         console.error("Failed to save wallet address:", error)
  //         toast({
  //           title: "Error",
  //           description: "Failed to save wallet address. Please try again.",
  //           variant: "destructive",
  //         })
  //       } finally {
  //         setIsSavingWallet(false)
  //       }
  //     }

  //     saveWalletAddress()
  //   }
  // }, [connected, publicKey, user, execute, setUser, toast, isSavingWallet])

  const handleCheckIn = () => {
    if (!hasWallet) return
    
    // Navigate to the QR code scanning page using Next.js router
    router.push('/checkin')
  }

  // If no wallet connected, show wallet connect button
  if (!hasWallet) {
    return (
      <div className="flex items-center gap-2">
        <WalletMultiButton 
          className="!bg-secondary !text-secondary-foreground hover:!bg-secondary/80 !text-sm !h-9 !px-3 !rounded-md !border-0 !font-medium backdrop-blur-sm"
        />
      </div>
    )
  }

  // If wallet connected, show check-in button
  return (
    <Button 
      variant="secondary" 
      size="sm" 
      className="backdrop-blur-sm bg-background/80"
      onClick={handleCheckIn}
    >
      <QrCode className="h-4 w-4 mr-2" />
      Check-in
    </Button>
  )
}