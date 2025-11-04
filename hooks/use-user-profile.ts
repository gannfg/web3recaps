/**
 * Custom hook to handle user profile loading and refreshing
 */

import { useEffect, useState } from 'react'
import { useSession } from '@/store/useSession'
import { useApi } from './use-api'

export function useUserProfile() {
  const { user, setUser } = useSession()
  const { execute } = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshProfile = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await execute('/api/users/me', {
        method: 'GET',
        credentials: 'include'
      })

      if (result.success && result.data?.user) {
        setUser(result.data.user)
        return result.data.user
      } else {
        throw new Error('Failed to load user profile')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Profile refresh failed:', errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user data is incomplete and needs refreshing
  // Only refresh if user exists but has no displayName (avatarUrl can be null for new users)
  const needsRefresh = user && !user.displayName

  useEffect(() => {
    if (needsRefresh && !isLoading) {
      console.log('User profile incomplete, refreshing...', user)
      refreshProfile().catch(() => {
        // Error already handled in refreshProfile
      })
    }
  }, [needsRefresh, isLoading])

  return {
    user,
    isLoading,
    error,
    refreshProfile,
    needsRefresh
  }
}
