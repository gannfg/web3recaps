"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/store/useSession"
import { Upload, Check, ArrowRight, ArrowLeft, Shield, FileImage, AlertCircle } from "lucide-react"
import { KycDocumentType } from "@/lib/types"

const kycFormSchema = z.object({
  documentType: z.enum(['passport', 'drivers_license', 'national_id', 'ktp'], {
    errorMap: () => ({ message: "Please select a document type" })
  }),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  documentFile: z.instanceof(File, { message: "Please select a document to upload" })
    .refine((file) => file.size <= 10 * 1024 * 1024, "File size must be less than 10MB")
    .refine(
      (file) => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type),
      "Only JPEG, PNG, and PDF files are allowed"
    )
})

type KycFormData = z.infer<typeof kycFormSchema>

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: 'Driver\'s License' },
  { value: 'national_id', label: 'National ID' },
  { value: 'ktp', label: 'KTP (Indonesian ID)' }
] as const

export function KycUploadForm() {
  const { user, setUser } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)

  const form = useForm<KycFormData>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      documentType: undefined,
      fullName: user?.kycFullName || "",
      documentFile: undefined
    }
  })

  const documentType = form.watch("documentType")
  const documentFile = form.watch("documentFile")

  const uploadDocument = useCallback(async (file: File): Promise<string> => {
    if (!user) throw new Error("User not found")

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'kyc-documents')
    formData.append('entityId', user.id)
    formData.append('entityType', 'user')

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const result = await execute('/api/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success && result.data?.publicUrl) {
        return result.data.publicUrl
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      clearInterval(progressInterval)
      throw error
    }
  }, [user, execute])

  const onSubmit = async (data: KycFormData) => {
    if (!user) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Upload document first
      const uploadedUrl = await uploadDocument(data.documentFile)

      // Submit KYC data
      const result = await execute('/api/users/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentUrl: uploadedUrl,
          documentType: data.documentType,
          fullName: data.fullName
        })
      })

      if (result.success && result.data?.user) {
        setUser(result.data.user)
        toast({
          title: "KYC Submitted Successfully! 🎉",
          description: "Your identity verification documents have been submitted for review.",
        })
        setDocumentUrl(uploadedUrl)
      } else {
        throw new Error(result.error || 'Failed to submit KYC')
      }
    } catch (error) {
      console.error('KYC submission error:', error)
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit KYC documents",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const nextStep = () => {
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const progress = (step / 3) * 100

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Document Type
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Document Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose your document type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Accepted Documents</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Passport (any country)</li>
                          <li>Driver's License</li>
                          <li>National ID Card</li>
                          <li>KTP (Indonesian ID)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name (as shown on document)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name exactly as it appears on your document" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Important</p>
                        <p>Make sure the name matches exactly what's written on your document. Any mismatch may result in rejection.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Document Upload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="documentFile"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>Upload Document</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  onChange(file)
                                }
                              }}
                              {...field}
                            />
                            {documentFile && (
                              <div className="text-sm text-muted-foreground">
                                Selected: {documentFile.name} ({(documentFile.size / 1024 / 1024).toFixed(2)} MB)
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Document Requirements</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Clear, high-quality image or PDF</li>
                          <li>All text must be readable</li>
                          <li>Document must be valid and not expired</li>
                          <li>Maximum file size: 10MB</li>
                          <li>Accepted formats: JPEG, PNG, PDF</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm text-muted-foreground">Uploading document...</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep} 
                disabled={step === 1 || isUploading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              {step < 3 ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={isUploading || (step === 1 && !documentType) || (step === 2 && !form.watch("fullName")?.trim())}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={!form.formState.isValid || isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Submit KYC
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
