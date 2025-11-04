"use client"

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useToast } from '@/hooks/use-toast'
import { useApi } from '@/hooks/use-api'
import { useSession } from '@/store/useSession'

export function useWalletConnection() {
  const { publicKey, connected, connecting, disconnect } = useWallet()
  const { toast } = useToast()
  const { execute } = useApi()
  const { user, setUser } = useSession()
  const [isSaving, setIsSaving] = useState(false)

  const saveWalletAddress = async (walletAddress: string) => {
    if (isSaving) return
    
    setIsSaving(true)
    
    try {
      const result = await execute("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress })
      })

      if (result.success && result.data) {
        setUser(result.data.user)
        toast({
          title: "Wallet Connected Successfully!",
          description: `Connected ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`,
        })
        return true
      } else {
        throw new Error(result.error || "Failed to save wallet address")
      }
    } catch (error) {
      console.error("Failed to save wallet address:", error)
      toast({
        title: "Error Saving Wallet",
        description: error instanceof Error ? error.message : "Failed to save wallet address. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const disconnectWallet = async () => {
    try {
      await disconnect()
      
      // Optionally remove wallet from user profile
      if (user?.walletAddress) {
        const result = await execute("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: null })
        })

        if (result.success && result.data) {
          setUser(result.data.user)
        }
      }

      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      })
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
      toast({
        title: "Disconnection Error",
        description: "Failed to disconnect wallet properly.",
        variant: "destructive",
      })
    }
  }

  // DISABLED: Auto-save wallet address when connected
  // Wallet addresses should only be saved during checkout process
  // useEffect(() => {
  //   if (connected && publicKey && user && !isSaving) {
  //     const walletAddress = publicKey.toString()
  //     
  //     // Only save if the wallet address is different or not saved
  //     if (user.walletAddress !== walletAddress) {
  //       saveWalletAddress(walletAddress)
  //     }
  //   }
  // }, [connected, publicKey, user, isSaving])

  return {
    publicKey,
    connected,
    connecting,
    isSaving,
    walletAddress: publicKey?.toString(),
    hasWalletStored: Boolean(user?.walletAddress),
    saveWalletAddress,
    disconnectWallet,
  }
}
