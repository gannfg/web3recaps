"use client"

import { useEffect } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface WalletConnectButtonProps {
  onConnect?: (address: string) => void
  className?: string
}

export function WalletConnectButton({ onConnect, className }: WalletConnectButtonProps) {
  const { publicKey, connected } = useWallet()
  const { toast } = useToast()

  // Notify parent component when wallet connects (no automatic saving)
  useEffect(() => {
    if (connected && publicKey && onConnect) {
      const walletAddress = publicKey.toString()
      toast({
        title: "Wallet Connected!",
        description: `Connected ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`,
      })
      onConnect(walletAddress)
    }
  }, [connected, publicKey, onConnect, toast])

  return (
    <div className={cn("wallet-adapter-button-trigger", className)}>
      <WalletMultiButton />
    </div>
  )
}