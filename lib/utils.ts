import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for ObeliskHub
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Utility functions for ObeliskHub
export function generateShortId(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase()
}

export function formatDate(date: string | Date): string {
  if (!date) return "Unknown date"
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return "Invalid date"
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj)
}

export function formatDateTime(date: string | Date): string {
  if (!date) return "Unknown date"
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return "Invalid date"
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj)
}

export function formatRelativeTime(date: string | Date): string {
  if (!date) return "Unknown time"
  
  const now = new Date()
  const target = new Date(date)
  
  if (isNaN(target.getTime())) return "Invalid time"
  
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return formatDate(date)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function isAbsoluteUrl(path: string) {
  return /^https?:\/\//i.test(path) || path.startsWith("data:")
}

/**
 * Convert a Supabase storage path (e.g. "avatars/user/image.png") into a public URL.
 * Returns the original value if it is already an absolute URL or if required env vars are missing.
 */
export function resolveStorageUrl(path?: string | null): string {
  if (!path) return ""
  if (isAbsoluteUrl(path)) return path

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return path

  const cleanedBase = baseUrl.replace(/\/+$/, "")
  const cleanedPath = path.replace(/^\/+/, "")

  if (cleanedPath.startsWith("storage/v1/object/public")) {
    return `${cleanedBase}/${cleanedPath}`
  }

  return `${cleanedBase}/storage/v1/object/public/${cleanedPath}`
}

