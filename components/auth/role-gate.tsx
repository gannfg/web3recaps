"use client"

import type React from "react"

import { useSession } from "@/store/useSession"
import type { UserRole } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldX } from "lucide-react"

interface RoleGateProps {
  children: React.ReactNode
  requiredRole: UserRole
  fallback?: React.ReactNode
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  Visitor: 0,
  Student: 1,
  Builder: 2,
  Author: 2,
  Admin: 3,
  VISITOR: 0,
  STUDENT: 1,
  BUILDER: 2,
  AUTHOR: 2,
  ADMIN: 3,
}

export function RoleGate({ children, requiredRole, fallback }: RoleGateProps) {
  const { user } = useSession()

  if (!user) {
    return (
      fallback || (
        <Alert>
          <ShieldX className="h-4 w-4" />
          <AlertDescription>Please connect your wallet to access this content.</AlertDescription>
        </Alert>
      )
    )
  }

  const userRoleLevel = ROLE_HIERARCHY[user.role as UserRole] ?? 0
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole]

  if (userRoleLevel < requiredRoleLevel) {
    return (
      fallback || (
        <Alert>
          <ShieldX className="h-4 w-4" />
          <AlertDescription>You need {requiredRole} role or higher to access this content.</AlertDescription>
        </Alert>
      )
    )
  }

  return <>{children}</>
}
