"use client"

import { useState } from 'react'
import { LoadingButton } from '@/components/ui/loading-button'
import { useApi } from '@/hooks/use-api'
import { useErrorToast } from '@/lib/error-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Demo component showing the new error handling system
 * This demonstrates how to use LoadingButton and ErrorToast together
 */
export function ErrorHandlingDemo() {
  const [demoError, setDemoError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { execute } = useApi()
  const errorToast = useErrorToast()

  const handleSuccessDemo = async () => {
    setIsSubmitting(true)
    setDemoError(null)
    
    try {
      // Simulate a successful API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      errorToast.showSuccess("Success!", "Operation completed successfully")
    } catch (error) {
      setDemoError("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleErrorDemo = async () => {
    setIsSubmitting(true)
    setDemoError(null)
    
    try {
      // Simulate an API call that fails
      const result = await execute("/api/demo/error", {
        method: 'POST',
        body: JSON.stringify({ demo: true })
      })
      
      if (!result.success) {
        setDemoError(result.error || "Demo error occurred")
      }
    } catch (error) {
      setDemoError("Network error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNetworkError = () => {
    errorToast.showNetworkError(() => {
      console.log('Retry clicked')
    })
  }

  const handleValidationError = () => {
    errorToast.showValidationError("This field is required", "Email")
  }

  const handleApiError = () => {
    errorToast.showApiError("User not found", 404)
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Demo</CardTitle>
          <CardDescription>
            This demonstrates the new error handling system with LoadingButton and ErrorToast
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* LoadingButton with Success */}
          <div className="space-y-2">
            <h4 className="font-medium">LoadingButton with Success</h4>
            <LoadingButton
              onClick={handleSuccessDemo}
              loading={isSubmitting}
              loadingText="Processing..."
              success={!isSubmitting && !demoError}
              className="w-full"
            >
              Simulate Success
            </LoadingButton>
          </div>

          {/* LoadingButton with Error */}
          <div className="space-y-2">
            <h4 className="font-medium">LoadingButton with Error</h4>
            <LoadingButton
              onClick={handleErrorDemo}
              loading={isSubmitting}
              loadingText="Processing..."
              error={demoError}
              onRetry={() => setDemoError(null)}
              className="w-full"
            >
              Simulate Error
            </LoadingButton>
          </div>

          {/* Toast Demos */}
          <div className="space-y-2">
            <h4 className="font-medium">Toast Notifications</h4>
            <div className="grid grid-cols-2 gap-2">
              <LoadingButton
                onClick={handleNetworkError}
                variant="outline"
                size="sm"
              >
                Network Error
              </LoadingButton>
              
              <LoadingButton
                onClick={handleValidationError}
                variant="outline"
                size="sm"
              >
                Validation Error
              </LoadingButton>
              
              <LoadingButton
                onClick={handleApiError}
                variant="outline"
                size="sm"
              >
                API Error (404)
              </LoadingButton>
              
              <LoadingButton
                onClick={() => errorToast.showSuccess("Demo Success", "This is a success message")}
                variant="outline"
                size="sm"
              >
                Success Toast
              </LoadingButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
