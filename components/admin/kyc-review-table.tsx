"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { Eye, Check, X, Search, Filter, Calendar, User, Shield, AlertCircle } from "lucide-react"
import { KycSubmission } from "@/lib/types"

interface KycReviewTableProps {
  className?: string
}

export function KycReviewTable({ className }: KycReviewTableProps) {
  const { execute } = useApi()
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<KycSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedSubmission, setSelectedSubmission] = useState<KycSubmission | null>(null)
  const [showDocument, setShowDocument] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const result = await execute(`/api/admin/kyc?status=${statusFilter}`, {
        method: 'GET'
      })

      if (result.success && result.data?.submissions) {
        setSubmissions(result.data.submissions)
      } else {
        throw new Error(result.error || 'Failed to load KYC submissions')
      }
    } catch (error) {
      console.error('Error loading KYC submissions:', error)
      toast({
        title: "Error",
        description: "Failed to load KYC submissions",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubmissions()
  }, [statusFilter])

  const handleApprove = async (submission: KycSubmission) => {
    setProcessing(submission.userId)
    try {
      const result = await execute(`/api/admin/kyc/${submission.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })

      if (result.success) {
        toast({
          title: "KYC Approved",
          description: `Identity verification approved for ${submission.displayName}`,
        })
        loadSubmissions()
      } else {
        throw new Error(result.error || 'Failed to approve KYC')
      }
    } catch (error) {
      console.error('Error approving KYC:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve KYC",
        variant: "destructive"
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (submission: KycSubmission) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      })
      return
    }

    setProcessing(submission.userId)
    try {
      const result = await execute(`/api/admin/kyc/${submission.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          rejectionReason: rejectionReason.trim()
        })
      })

      if (result.success) {
        toast({
          title: "KYC Rejected",
          description: `Identity verification rejected for ${submission.displayName}`,
        })
        setShowRejectDialog(false)
        setRejectionReason("")
        loadSubmissions()
      } else {
        throw new Error(result.error || 'Failed to reject KYC')
      }
    } catch (error) {
      console.error('Error rejecting KYC:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject KYC",
        variant: "destructive"
      })
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Verified</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'passport': return 'Passport'
      case 'drivers_license': return 'Driver\'s License'
      case 'national_id': return 'National ID'
      case 'ktp': return 'KTP (Indonesian ID)'
      default: return type
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredSubmissions = submissions.filter(submission =>
    submission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>KYC Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading KYC submissions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          KYC Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No KYC submissions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{submission.displayName}</p>
                        <p className="text-sm text-muted-foreground">{submission.email}</p>
                        <p className="text-sm text-muted-foreground">{submission.fullName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getDocumentTypeLabel(submission.documentType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(submission.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(submission.submittedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>KYC Document Review</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>User Information</Label>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Name:</strong> {submission.displayName}</p>
                                    <p><strong>Email:</strong> {submission.email}</p>
                                    <p><strong>Full Name:</strong> {submission.fullName}</p>
                                    <p><strong>Document Type:</strong> {getDocumentTypeLabel(submission.documentType)}</p>
                                    <p><strong>Submitted:</strong> {formatDate(submission.submittedAt)}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Document</Label>
                                  <div className="border rounded-lg overflow-hidden">
                                    {submission.documentUrl.endsWith('.pdf') ? (
                                      <iframe
                                        src={submission.documentUrl}
                                        className="w-full h-64"
                                        title="KYC Document"
                                      />
                                    ) : (
                                      <img
                                        src={submission.documentUrl}
                                        alt="KYC Document"
                                        className="w-full h-64 object-contain"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {submission.status === 'pending' && (
                                <div className="flex gap-2 pt-4">
                                  <Button
                                    onClick={() => handleApprove(submission)}
                                    disabled={processing === submission.userId}
                                    className="flex-1"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedSubmission(submission)
                                      setShowRejectDialog(true)
                                    }}
                                    disabled={processing === submission.userId}
                                    className="flex-1"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject KYC Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Rejection Reason Required</p>
                    <p>Please provide a clear reason for rejecting this KYC submission. The user will see this reason.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false)
                    setRejectionReason("")
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedSubmission && handleReject(selectedSubmission)}
                  disabled={!rejectionReason.trim() || processing === selectedSubmission?.userId}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject KYC
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
