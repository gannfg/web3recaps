/**
 * Simple Error Toast System
 * Provides clean, theme-aware toast notifications for existing errors
 */

import { toast } from 'sonner'

export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export class ErrorToast {
  /**
   * Show error toast with theme-aware styling
   */
  static showError(title: string, description?: string, options: ToastOptions = {}): string | number {
    return toast.error(title, {
      description,
      duration: options.duration || 5000,
      action: options.action,
      className: 'border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    })
  }

  /**
   * Show success toast
   */
  static showSuccess(title: string, description?: string, options: ToastOptions = {}): string | number {
    return toast.success(title, {
      description,
      duration: options.duration || 3000,
      action: options.action,
      className: 'border-green-200 bg-green-50 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    })
  }

  /**
   * Show info toast
   */
  static showInfo(title: string, description?: string, options: ToastOptions = {}): string | number {
    return toast.info(title, {
      description,
      duration: options.duration || 3000,
      action: options.action,
      className: 'border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    })
  }

  /**
   * Show warning toast
   */
  static showWarning(title: string, description?: string, options: ToastOptions = {}): string | number {
    return toast.warning(title, {
      description,
      duration: options.duration || 4000,
      action: options.action,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    })
  }

  /**
   * Show network error with retry option
   */
  static showNetworkError(retryAction?: () => void): string | number {
    return this.showError(
      'Connection Error',
      'Please check your internet connection and try again.',
      {
        action: retryAction ? {
          label: 'Retry',
          onClick: retryAction,
        } : undefined,
        duration: 8000,
      }
    )
  }

  /**
   * Show validation error
   */
  static showValidationError(message: string, field?: string): string | number {
    return this.showError(
      field ? `Invalid ${field}` : 'Validation Error',
      message,
      { duration: 4000 }
    )
  }

  /**
   * Show API error response
   */
  static showApiError(error: string, status?: number): string | number {
    let title = 'Request Failed'
    let description = error

    // Customize based on status code
    if (status === 401) {
      title = 'Authentication Required'
      description = 'Please sign in to continue'
    } else if (status === 403) {
      title = 'Access Denied'
      description = 'You don\'t have permission to perform this action'
    } else if (status === 404) {
      title = 'Not Found'
      description = 'The requested resource was not found'
    } else if (status === 429) {
      title = 'Too Many Requests'
      description = 'Please slow down your requests and try again'
    } else if (status !== undefined && status >= 500) {
      title = 'Server Error'
      description = 'Something went wrong on our end. Please try again later'
    }

    return this.showError(title, description, {
      duration: status !== undefined && status >= 500 ? 8000 : 5000,
    })
  }

  /**
   * Show file upload error
   */
  static showUploadError(message: string): string | number {
    return this.showError('Upload Failed', message, { duration: 5000 })
  }

  /**
   * Show loading state
   */
  static showLoading(message: string = 'Loading...'): string | number {
    return toast.loading(message, {
      duration: Infinity,
    })
  }

  /**
   * Dismiss specific toast
   */
  static dismiss(toastId: string | number): void {
    toast.dismiss(toastId)
  }

  /**
   * Dismiss all toasts
   */
  static dismissAll(): void {
    toast.dismiss()
  }
}

// Hook for easy usage in components
export function useErrorToast() {
  return {
    showError: ErrorToast.showError,
    showSuccess: ErrorToast.showSuccess,
    showInfo: ErrorToast.showInfo,
    showWarning: ErrorToast.showWarning,
    showNetworkError: ErrorToast.showNetworkError,
    showValidationError: ErrorToast.showValidationError,
    showApiError: ErrorToast.showApiError,
    showUploadError: ErrorToast.showUploadError,
    showLoading: ErrorToast.showLoading,
    dismiss: ErrorToast.dismiss,
    dismissAll: ErrorToast.dismissAll,
  }
}
