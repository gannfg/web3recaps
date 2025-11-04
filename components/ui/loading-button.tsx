"use client"

import React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from './button'
import { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
  error?: string | null
  success?: boolean
  onRetry?: () => void
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    loading = false, 
    loadingText = 'Loading...', 
    error, 
    success = false,
    onRetry,
    children, 
    className, 
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading
    const showError = error && !loading
    const showSuccess = success && !loading

    return (
      <div className="space-y-2">
        <Button
          ref={ref}
          className={cn(
            'relative',
            showError && 'border-destructive text-destructive hover:bg-destructive/10',
            showSuccess && 'border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400',
            className
          )}
          disabled={isDisabled}
          {...props}
        >
          {loading && (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingText}
            </>
          )}
          {!loading && children}
        </Button>
        
        {showError && (
          <div className="text-sm text-destructive flex items-center gap-2">
            <span>{error}</span>
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-auto p-0 text-destructive hover:text-destructive/80"
              >
                Retry
              </Button>
            )}
          </div>
        )}
        
        {showSuccess && (
          <div className="text-sm text-green-600 dark:text-green-400">
            Success!
          </div>
        )}
      </div>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'
