"use client"

import { useState, useCallback } from 'react'
import { useErrorToast } from '@/lib/error-toast'

interface UseApiWithToastOptions {
  showSuccessToast?: boolean
  successMessage?: string
  showErrorToast?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}

/**
 * Enhanced API hook with automatic toast notifications
 */
export function useApiWithToast<T = any>(options: UseApiWithToastOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<T | null>(null)
  const toast = useErrorToast()

  const execute = useCallback(async (
    url: string, 
    requestOptions: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions.headers,
        },
        ...requestOptions,
      })

      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
        
        if (options.showSuccessToast && options.successMessage) {
          toast.showSuccess('Success', options.successMessage)
        }
        
        options.onSuccess?.(result.data)
        return { success: true, data: result.data }
      } else {
        const errorMessage = result.error || 'Request failed'
        setError(errorMessage)
        
        if (options.showErrorToast !== false) {
          toast.showApiError(errorMessage, response.status)
        }
        
        options.onError?.(errorMessage)
        return { success: false, error: errorMessage }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      
      if (options.showErrorToast !== false) {
        // Check if it's a network error
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          toast.showNetworkError()
        } else {
          toast.showApiError(errorMessage)
        }
      }
      
      options.onError?.(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [toast, options])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { 
    loading, 
    error, 
    data, 
    execute, 
    reset 
  }
}

/**
 * Hook for form submissions with toast notifications
 */
export function useFormWithToast<T>(
  onSubmit: (data: T) => Promise<any>,
  options: UseApiWithToastOptions = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useErrorToast()

  const handleSubmit = useCallback(async (data: T) => {
    setLoading(true)
    setError(null)

    try {
      const result = await onSubmit(data)
      
      if (options.showSuccessToast && options.successMessage) {
        toast.showSuccess('Success', options.successMessage)
      }
      
      options.onSuccess?.(result)
      return { success: true, data: result }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed'
      setError(errorMessage)
      
      if (options.showErrorToast !== false) {
        toast.showError('Submission Failed', errorMessage)
      }
      
      options.onError?.(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [onSubmit, toast, options])

  return {
    loading,
    error,
    handleSubmit,
  }
}
