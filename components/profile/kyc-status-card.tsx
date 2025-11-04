"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, CheckCircle, Clock, XCircle, Eye, AlertCircle, Calendar, User } from "lucide-react"
import { User as UserType, KycStatus } from "@/lib/types"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface KycStatusCardProps {
  user: UserType
  onResubmit?: () => void
}

export function KycStatusCard({ user, onResubmit }: KycStatusCardProps) {
  const [showDocument, setShowDocument] = useState(false)

  const getStatusInfo = (status: KycStatus | undefined) => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          badge: 'verified',
          badgeVariant: 'default' as const,
          title: 'Identity Verified',
          description: 'Your identity has been successfully verified.'
        }
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          badge: 'pending',
          badgeVariant: 'secondary' as const,
          title: 'Under Review',
          description: 'Your documents are being reviewed by our team.'
        }
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          badge: 'rejected',
          badgeVariant: 'destructive' as const,
          title: 'Verification Rejected',
          description: 'Your documents were not approved. Please resubmit.'
        }
      default:
        return {
          icon: Shield,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          badge: 'not_submitted',
          badgeVariant: 'outline' as const,
          title: 'Not Verified',
          description: 'You need to submit identity verification documents.'
        }
    }
  }

  const statusInfo = getStatusInfo(user.kycStatus)
  const StatusIcon = statusInfo.icon

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDocumentTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'passport': return 'Passport'
      case 'drivers_license': return 'Driver\'s License'
      case 'national_id': return 'National ID'
      case 'ktp': return 'KTP (Indonesian ID)'
      default: return 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            </div>
            Identity Verification
          </CardTitle>
          <Badge variant={statusInfo.badgeVariant}>
            {statusInfo.badge.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-muted-foreground">{statusInfo.description}</p>
          
          {user.kycStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Full Name</p>
                    <p className="text-sm text-muted-foreground">
                      {user.kycFullName || 'Not provided'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Document Type</p>
                    <p className="text-sm text-muted-foreground">
                      {getDocumentTypeLabel(user.kycDocumentType)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Submitted</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.kycSubmittedAt)}
                    </p>
                  </div>
                </div>
                
                {user.kycVerifiedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Verified</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(user.kycVerifiedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {user.kycDocumentUrl && user.kycStatus === 'verified' && (
            <div className="pt-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Identity Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium mb-1">Document Privacy</p>
                          <p>This document is only visible to you and authorized administrators. It will be used for identity verification purposes only.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      {user.kycDocumentUrl.endsWith('.pdf') ? (
                        <iframe
                          src={user.kycDocumentUrl}
                          className="w-full h-96"
                          title="KYC Document"
                        />
                      ) : (
                        <img
                          src={user.kycDocumentUrl}
                          alt="KYC Document"
                          className="w-full h-auto max-h-96 object-contain"
                        />
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {user.kycStatus === 'rejected' && (
            <div className="pt-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                      Verification Rejected
                    </p>
                    <p className="text-red-700 dark:text-red-300">
                      Your identity verification was not approved. Please review the requirements and resubmit with corrected documents.
                    </p>
                  </div>
                </div>
              </div>
              
              {onResubmit && (
                <Button 
                  onClick={onResubmit} 
                  className="mt-4"
                  variant="outline"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Resubmit Documents
                </Button>
              )}
            </div>
          )}

          {user.kycStatus === 'pending' && (
            <div className="pt-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Under Review
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Your documents are being reviewed by our team. This usually takes 1-2 business days. You'll be notified once approved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!user.kycStatus && (
            <div className="pt-4">
              <div className="bg-muted/50 border rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Identity Verification Required</p>
                    <p>To access all features, you need to verify your identity by uploading a government-issued ID document.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
