"use client"

import { ReactNode } from "react"
import { useSession } from "@/store/useSession"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Clock, XCircle, CheckCircle, AlertCircle } from "lucide-react"
import { KycUploadForm } from "@/components/profile/kyc-upload-form"

interface KycRequiredGateProps {
  children: ReactNode
  fallback?: ReactNode
}

export function KycRequiredGate({ children, fallback }: KycRequiredGateProps) {
  const { user } = useSession()

  // If user is not loaded yet, show loading
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If KYC is verified, show children
  if (user.kycVerified) {
    return <>{children}</>
  }

  // If fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Show appropriate UI based on KYC status
  const getKycStatusUI = () => {
    // If status is pending but no document URL, show upload form
    if (user.kycStatus === 'pending' && !user.kycDocumentUrl) {
      return (
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Identity Verification Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                To access coworking space features, you need to verify your identity.
              </p>
              <p className="text-sm text-muted-foreground">
                Upload a clear photo of your government-issued ID document.
              </p>
            </div>

            <KycUploadForm />

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Why do I need to verify my identity?</p>
                  <p>Identity verification ensures a safe and secure environment for all coworking space members.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    switch (user.kycStatus) {
      case 'pending':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle>KYC Under Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Review
                </Badge>
                <p className="text-muted-foreground">
                  Your identity verification documents are being reviewed by our team.
                </p>
                <p className="text-sm text-muted-foreground">
                  This usually takes 1-2 business days. You'll be notified once approved.
                </p>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">What happens next?</p>
                    <p>Our admin team will review your documents and approve your account. You'll then be able to access all features.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'rejected':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>KYC Rejected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
                <p className="text-muted-foreground">
                  Your identity verification was not approved. You can resubmit with corrected documents.
                </p>
              </div>

              <div className="space-y-3">
                <Button className="w-full" onClick={() => window.location.reload()}>
                  <Shield className="h-4 w-4 mr-2" />
                  Resubmit KYC
                </Button>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Why was it rejected?</p>
                    <p>Common reasons include unclear document images, incorrect document type, or missing information.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      default:
        // No KYC submitted yet - show upload form
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Identity Verification Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  To access coworking space features, you need to verify your identity.
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo of your government-issued ID document.
                </p>
              </div>

              <KycUploadForm />

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Why do I need to verify my identity?</p>
                    <p>Identity verification ensures a safe and secure environment for all coworking space members.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      {getKycStatusUI()}
    </div>
  )
}
