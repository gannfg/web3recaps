"use client"

import { useState, useCallback } from "react"
import type { ApiResponse } from "@/lib/types"
import { useSession } from "@/store/useSession"
import { useToast } from "@/hooks/use-toast"
import { useErrorToast } from "@/lib/error-toast"

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  notifyOnError?: boolean
  notifyOnSuccess?: boolean
  successMessage?: string
}

interface ExecuteOptions extends RequestInit {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<T | null>(null)
  const { user } = useSession()
  const { toast } = useToast()
  const errorToast = useErrorToast()

  const execute = useCallback(
    async (url: string, requestOptions: ExecuteOptions = {}): Promise<ApiResponse<T>> => {
      setLoading(true)
      setError(null)

      try {
        // Don't set Content-Type for FormData - let the browser set it with boundary
        const headers: Record<string, string> = { ...(requestOptions.headers as Record<string, string>) }
        
        // Add user ID header for authentication
        if (user?.id) {
          headers["x-user-id"] = user.id
        }
        
        // Only set Content-Type to application/json if body is not FormData
        if (!(requestOptions.body instanceof FormData)) {
          headers["Content-Type"] = "application/json"
        }

        const response = await fetch(url, {
          ...requestOptions,
          headers,
          credentials: requestOptions.credentials ?? 'include',
        })

        let result: ApiResponse<T>
        try {
          result = await response.json()
        } catch (jsonError) {
          console.error("JSON parsing error:", jsonError)
          console.error("Response status:", response.status)
          console.error("Response headers:", Object.fromEntries(response.headers.entries()))
          const text = await response.text()
          console.error("Response text:", text)
          return { success: false, error: `Invalid JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}` }
        }

        if (result.success && result.data) {
          setData(result.data)
          requestOptions.onSuccess?.(result.data)
          if (options.notifyOnSuccess && options.successMessage) {
            errorToast.showSuccess("Success", options.successMessage)
          }
        } else if (result.error) {
          setError(result.error)
          requestOptions.onError?.(result.error)
          if (options.notifyOnError !== false) {
            errorToast.showApiError(result.error, response.status)
          }
        }

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred"
        setError(errorMessage)
        requestOptions.onError?.(errorMessage)
        if (options.notifyOnError !== false) {
          // Check if it's a network error
          if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            errorToast.showNetworkError()
          } else {
            errorToast.showError("Request Failed", errorMessage)
          }
        }
        return { success: false, error: errorMessage }
      } finally {
        setLoading(false)
      }
    },
    [user?.id, errorToast],
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { loading, error, data, execute, reset }
}
