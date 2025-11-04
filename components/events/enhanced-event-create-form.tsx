import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from "@/components/ui/loading-button"
import { X, Plus, MapPin, Globe, Users, Clock, DollarSign, Tag, BookOpen, Target, Package, Upload, Image as ImageIcon } from "lucide-react"
import { useState, useEffect } from "react"
import type { Event } from "@/lib/types"
import { getResizeFunction } from "@/lib/image-utils"

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  eventType: z.enum(["marketing", "social", "workshop", "1on1", "study_group", "hackathon", "meetup", "conference", "networking"]),
  location: z.string().min(1, "Location is required"),
  locationType: z.enum(["online", "physical", "hybrid"]),
  capacityType: z.enum(["unlimited", "limited", "invite_only"]),
  maxAttendees: z.number().min(1, "Max attendees must be at least 1"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all"]),
  xpReward: z.number().min(0, "XP reward cannot be negative"),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed"),
  requirements: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  cost: z.number().min(0, "Cost cannot be negative").default(0),
  currency: z.string().default("USD"),
  ageRestriction: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  learningObjectives: z.array(z.string()).optional(),
  materialsProvided: z.array(z.string()).optional(),
  contactPhone: z.string().optional(),
  bannerImage: z.string().url().optional(),
  logoImage: z.string().url().optional(),
  coverImage: z.string().url().optional(),
  isPublic: z.boolean(),
  isRecurring: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  externalUrl: z.string().url().optional(),
  organizers: z.array(z.object({
    organizerType: z.enum(["user", "team"]),
    organizerId: z.string(),
    role: z.enum(["primary", "secondary", "co_organizer"]).default("co_organizer"),
  })).optional().default([]),
})

type EventData = z.infer<typeof eventSchema>

const EVENT_TYPES = [
  { value: "marketing", label: "Marketing Event", description: "Promote your brand or product", xp: 20, icon: "" },
  { value: "social", label: "Social Event", description: "Community gathering and networking", xp: 30, icon: "" },
  { value: "workshop", label: "Workshop", description: "Educational session", xp: 70, icon: "" },
  { value: "1on1", label: "1-on-1 Session", description: "Personal mentoring", xp: 30, icon: "" },
  { value: "study_group", label: "Study Group", description: "Collaborative learning", xp: 50, icon: "" },
  { value: "hackathon", label: "Hackathon", description: "Building competition", xp: 100, icon: "" },
  { value: "meetup", label: "Meetup", description: "Community gathering", xp: 40, icon: "" },
  { value: "conference", label: "Conference", description: "Professional event", xp: 80, icon: "" },
  { value: "networking", label: "Networking", description: "Professional connections", xp: 25, icon: "" },
] as const

const SUGGESTED_TAGS = [
  "solana", "rust", "react", "typescript", "javascript", "defi", "nft", "web3", "blockchain",
  "beginner-friendly", "hands-on", "advanced", "networking", "career", "tutorial", "live-coding"
]

interface EnhancedEventCreateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventCreated: (event: Event) => void
}

export function EnhancedEventCreateForm({ open, onOpenChange, onEventCreated }: EnhancedEventCreateFormProps) {
  const { user } = useSession()
  const { execute, loading } = useApi()
  const { toast } = useToast()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState("")
  const [requirementInput, setRequirementInput] = useState("")
  const [materialInput, setMaterialInput] = useState("")
  const [prerequisiteInput, setPrerequisiteInput] = useState("")
  const [objectiveInput, setObjectiveInput] = useState("")
  const [providedMaterialInput, setProvidedMaterialInput] = useState("")
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState("basic")
  const [tabErrors, setTabErrors] = useState<Record<string, string[]>>({})
  const [logoImageFile, setLogoImageFile] = useState<File | null>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  const form = useForm<EventData>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      eventDate: "",
      startTime: "",
      endTime: "",
      eventType: "marketing",
      location: "",
      locationType: "physical",
      capacityType: "limited",
      maxAttendees: 20,
      skillLevel: "all",
      xpReward: 50,
      tags: [],
      requirements: [],
      materials: [],
      cost: 0,
      currency: "USD",
      ageRestriction: "",
      prerequisites: [],
      learningObjectives: [],
      materialsProvided: [],
      contactPhone: "",
      isPublic: true,
      isRecurring: false,
      isFeatured: false,
      externalUrl: "",
      organizers: [],
    },
  })

  // Validation functions for each tab
  const validateBasicTab = (): string[] => {
    const errors: string[] = []
    const values = form.getValues()
    
    if (!values.title?.trim()) errors.push("Title is required")
    if (!values.description?.trim()) errors.push("Description is required")
    if (values.description && values.description.length < 10) errors.push("Description must be at least 10 characters")
    if (!values.eventDate) errors.push("Event date is required")
    if (!values.startTime) errors.push("Start time is required")
    if (!values.endTime) errors.push("End time is required")
    if (!values.location?.trim()) errors.push("Location is required")
    
    return errors
  }

  const validateDetailsTab = (): string[] => {
    const errors: string[] = []
    const values = form.getValues()
    
    if (values.maxAttendees && values.maxAttendees < 1) errors.push("Max attendees must be at least 1")
    if (values.xpReward < 0) errors.push("XP reward cannot be negative")
    if (values.cost < 0) errors.push("Cost cannot be negative")
    if (values.tags && values.tags.length > 10) errors.push("Maximum 10 tags allowed")
    
    return errors
  }

  const validateRequirementsTab = (): string[] => {
    // Requirements tab has no required fields, so no validation needed
    return []
  }

  const validateContactTab = (): string[] => {
    // Contact tab has no required fields, so no validation needed
    return []
  }

  const validateCurrentTab = (): string[] => {
    switch (activeTab) {
      case "basic": return validateBasicTab()
      case "details": return validateDetailsTab()
      case "requirements": return validateRequirementsTab()
      case "contact": return validateContactTab()
      default: return []
    }
  }

  const handleNext = () => {
    const errors = validateCurrentTab()
    setTabErrors(prev => ({ ...prev, [activeTab]: errors }))
    
    if (errors.length === 0) {
      const tabs = ["basic", "details", "requirements", "contact"]
      const currentIndex = tabs.indexOf(activeTab)
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1])
      }
    }
  }

  const handlePrevious = () => {
    const tabs = ["basic", "details", "requirements", "contact"]
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1])
    }
  }

  const handleCreate = async () => {
    // Validate all tabs before creating
    const allErrors: Record<string, string[]> = {}
    let hasErrors = false
    
    const tabs = ["basic", "details", "requirements", "contact"]
    tabs.forEach(tab => {
      setActiveTab(tab) // Temporarily set tab to validate
      const errors = validateCurrentTab()
      allErrors[tab] = errors
      if (errors.length > 0) hasErrors = true
    })
    
    setActiveTab("basic") // Reset to first tab
    setTabErrors(allErrors)
    
    if (hasErrors) {
      toast({
        title: "Validation Error",
        description: "Please fix all required fields before creating the event",
        variant: "destructive",
      })
      return
    }
    
    // If no errors, proceed with form submission
    await onSubmit(form.getValues())
  }

  const addTag = () => {
    if (tagInput.trim() && !form.getValues("tags").includes(tagInput.trim())) {
      const currentTags = form.getValues("tags")
      form.setValue("tags", [...currentTags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags")
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove))
  }

  const addArrayItem = (field: keyof EventData, input: string, setInput: (value: string) => void) => {
    if (input.trim()) {
      const currentItems = form.getValues(field) as string[]
      form.setValue(field, [...(currentItems || []), input.trim()])
      setInput("")
    }
  }

  const removeArrayItem = (field: keyof EventData, itemToRemove: string) => {
    const currentItems = form.getValues(field) as string[]
    form.setValue(field, (currentItems || []).filter(item => item !== itemToRemove))
  }

  const uploadImage = async (file: File, type: 'banner' | 'logo' | 'cover') => {
    console.log(`Uploading ${type} image:`, file.name, file.size)
    
    try {
      // Resize and compress the image before upload
      const resizeFunction = getResizeFunction(type)
      const resizedFile = await resizeFunction(file)
      
      console.log(`Resized ${type} image:`, resizedFile.name, resizedFile.size)
      
      const formData = new FormData()
      formData.append('file', resizedFile)
      formData.append('bucket', 'event-images')
      formData.append('type', type)

      const result = await execute('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log(`Upload result for ${type}:`, result)
      console.log(`Upload result data:`, result.data)
      console.log(`Upload result data keys:`, Object.keys(result.data || {}))

      if (result.success) {
        console.log(`Successfully uploaded ${type} image:`, result.data.publicUrl)
        return result.data.publicUrl
      } else {
        console.error(`Failed to upload ${type} image:`, result.error)
        throw new Error(result.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error(`Error processing ${type} image:`, error)
      throw error
    }
  }

  const onSubmit = async (data: any) => {
    if (!user) return

    setSubmitError(null)
    try {
      console.log('=== FORM SUBMISSION DEBUG ===')
      console.log('Form data:', data)
      console.log('Files available for upload:', {
        bannerImageFile: bannerImageFile?.name,
        logoImageFile: logoImageFile?.name,
        coverImageFile: coverImageFile?.name
      })
      console.log('File objects:', {
        bannerImageFile,
        logoImageFile,
        coverImageFile
      })

      // Upload images if provided
    let bannerImageUrl = data.bannerImage
    let logoImageUrl = data.logoImage
    let coverImageUrl = data.coverImage

    if (bannerImageFile) {
      console.log('Uploading banner image...')
      bannerImageUrl = await uploadImage(bannerImageFile, 'banner')
    }
    if (logoImageFile) {
      console.log('Uploading logo image...')
      logoImageUrl = await uploadImage(logoImageFile, 'logo')
    }
    if (coverImageFile) {
      console.log('Uploading cover image...')
      coverImageUrl = await uploadImage(coverImageFile, 'cover')
    }

    const eventData = {
      ...data,
      bannerImage: bannerImageUrl,
      logoImage: logoImageUrl,
      coverImage: coverImageUrl,
    }

    console.log('Event data being sent:', {
      title: eventData.title,
      bannerImage: eventData.bannerImage,
      logoImage: eventData.logoImage,
      coverImage: eventData.coverImage
    })

    const result = await execute("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
      },
      body: JSON.stringify(eventData),
    })

    if (result.success) {
      onEventCreated(result.data)
      form.reset()
      setBannerImageFile(null)
      setLogoImageFile(null)
      setCoverImageFile(null)
      onOpenChange(false)
      toast({
        title: "Event Created",
        description: "Your event has been created successfully!",
      })
    } else {
      setSubmitError(result.error || "Failed to create event")
    }
  } catch (error) {
    console.error("Error creating event:", error)
    setSubmitError("An error occurred while creating the event")
  }
}

  const selectedEventType = EVENT_TYPES.find(type => type.value === form.watch("eventType"))

  const loadTeams = async () => {
    if (!user) return
    
    setLoadingTeams(true)
    try {
      const result = await execute("/api/teams", {
        headers: {
          "x-user-id": user.id,
        },
      })
      console.log("Teams API result:", result)
      if (result.success && result.data) {
        // The teams API returns data.teams when no member filter, data directly when member filter
        const teamsData = result.data.teams || result.data || []
        console.log("Teams data:", teamsData)
        setTeams(teamsData)
      } else {
        console.log("Teams API failed:", result.error)
      }
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoadingTeams(false)
    }
  }

  // Load teams when form opens
  useEffect(() => {
    if (open && user) {
      loadTeams()
    }
  }, [open, user])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Create an engaging event for the community
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter event title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => {
                        const eventType = form.watch("eventType")
                        const getPlaceholder = () => {
                          switch (eventType) {
                            case "marketing":
                              return "Tell us about your brand, product, or service. What makes you unique? What value do you bring to the community? Share your story, mission, and what attendees can expect..."
                            case "social":
                              return "Describe your social event! What's the vibe? What activities will you have? Who should attend? Share the fun details that will make people want to join..."
                            case "workshop":
                              return "What will participants learn? What skills or knowledge will they gain? Include prerequisites, materials needed, and learning objectives..."
                            case "1on1":
                              return "What kind of mentoring or coaching will you provide? What topics can you help with? What's your background and expertise..."
                            case "study_group":
                              return "What subject or topic will you be studying? What's the format? How will participants collaborate and learn together..."
                            case "hackathon":
                              return "What's the challenge or theme? What technologies will be used? What are the prizes or rewards? What makes this hackathon special..."
                            case "meetup":
                              return "What's the purpose of this meetup? Who should attend? What activities or discussions will you have? What's the community focus..."
                            case "conference":
                              return "What's the main theme or topic? Who are the speakers? What sessions or tracks will you have? What makes this conference valuable..."
                            case "networking":
                              return "What's the networking focus? What industries or roles should attend? What activities or format will facilitate connections..."
                            default:
                              return "Describe your event in detail..."
                          }
                        }
                        
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-semibold">
                              Event Description
                              <span className="text-red-500 ml-1">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={getPlaceholder()}
                                className="min-h-[150px] text-sm leading-relaxed"
                                {...field}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              {field.value?.length || 0}/500 characters
                            </div>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    {/* Image Upload Fields */}
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Event Images</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Banner Image */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Banner Image</label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            {bannerImageFile ? (
                              <div className="space-y-2">
                                <img 
                                  src={URL.createObjectURL(bannerImageFile)} 
                                  alt="Banner preview"
                                  className="w-full h-20 object-cover rounded"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setBannerImageFile(null)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                                <div className="text-sm text-muted-foreground">Banner (1200x400)</div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    console.log('=== BANNER FILE INPUT CHANGED ===')
                                    console.log('Event target files:', e.target.files)
                                    const file = e.target.files?.[0]
                                    console.log('Banner file selected:', file)
                                    if (file) {
                                      console.log('Setting banner file:', file.name, file.size)
                                      setBannerImageFile(file)
                                    } else {
                                      console.log('No file selected for banner')
                                    }
                                  }}
                                  className="hidden"
                                  id="banner-upload"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('banner-upload')?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Logo Image */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Logo Image</label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            {logoImageFile ? (
                              <div className="space-y-2">
                                <img 
                                  src={URL.createObjectURL(logoImageFile)} 
                                  alt="Logo preview"
                                  className="w-full h-20 object-cover rounded"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLogoImageFile(null)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                                <div className="text-sm text-muted-foreground">Logo (200x200)</div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    console.log('=== LOGO FILE INPUT CHANGED ===')
                                    const file = e.target.files?.[0]
                                    console.log('Logo file selected:', file)
                                    if (file) {
                                      console.log('Setting logo file:', file.name, file.size)
                                      setLogoImageFile(file)
                                    }
                                  }}
                                  className="hidden"
                                  id="logo-upload"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('logo-upload')?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cover Image */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Cover Image</label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                            {coverImageFile ? (
                              <div className="space-y-2">
                                <img 
                                  src={URL.createObjectURL(coverImageFile)} 
                                  alt="Cover preview"
                                  className="w-full h-20 object-cover rounded"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCoverImageFile(null)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                                <div className="text-sm text-muted-foreground">Cover (400x300)</div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    console.log('=== COVER FILE INPUT CHANGED ===')
                                    const file = e.target.files?.[0]
                                    console.log('Cover file selected:', file)
                                    if (file) {
                                      console.log('Setting cover file:', file.name, file.size)
                                      setCoverImageFile(file)
                                    }
                                  }}
                                  className="hidden"
                                  id="cover-upload"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('cover-upload')?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Date *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select event type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="min-w-[300px]">
                                {EVENT_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2 w-full">
                                      {type.icon && <span className="flex-shrink-0">{type.icon}</span>}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{type.label}</div>
                                        <div className="text-xs text-muted-foreground truncate">{type.description}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time *</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time *</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="locationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="physical">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Physical Location
                                  </div>
                                </SelectItem>
                                <SelectItem value="online">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Online
                                  </div>
                                </SelectItem>
                                <SelectItem value="hybrid">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Hybrid
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="capacityType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select capacity type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unlimited">Unlimited</SelectItem>
                                <SelectItem value="limited">Limited</SelectItem>
                                <SelectItem value="invite_only">Invite Only</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={form.watch("locationType") === "online" ? "Zoom, Discord, etc." : "Enter address or venue"} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("capacityType") === "limited" && (
                      <FormField
                        control={form.control}
                        name="maxAttendees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Attendees *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="20" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="skillLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skill Level *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select skill level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="xpReward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>XP Reward</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder="50" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Tags</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("tags").map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" variant="outline" onClick={addTag}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {SUGGESTED_TAGS.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => {
                              if (!form.getValues("tags").includes(tag)) {
                                const currentTags = form.getValues("tags")
                                form.setValue("tags", [...currentTags, tag])
                              }
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {tabErrors.basic && tabErrors.basic.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {tabErrors.basic.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing & Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                placeholder="0.00" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="SOL">SOL</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="ageRestriction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Restriction</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 18+, 21+, All ages" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="externalUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>External URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="isPublic"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Public Event</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Make this event visible to all users
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Recurring Event</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                This event repeats regularly
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Featured Event</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Highlight this event on the homepage
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {tabErrors.details && tabErrors.details.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {tabErrors.details.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Requirements & Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <FormLabel>Requirements</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("requirements")?.map((req) => (
                          <Badge key={req} variant="secondary" className="flex items-center gap-1">
                            {req}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeArrayItem("requirements", req)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add requirement..."
                          value={requirementInput}
                          onChange={(e) => setRequirementInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("requirements", requirementInput, setRequirementInput))}
                        />
                        <Button type="button" variant="outline" onClick={() => addArrayItem("requirements", requirementInput, setRequirementInput)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Prerequisites</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("prerequisites")?.map((prereq) => (
                          <Badge key={prereq} variant="secondary" className="flex items-center gap-1">
                            {prereq}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeArrayItem("prerequisites", prereq)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add prerequisite..."
                          value={prerequisiteInput}
                          onChange={(e) => setPrerequisiteInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("prerequisites", prerequisiteInput, setPrerequisiteInput))}
                        />
                        <Button type="button" variant="outline" onClick={() => addArrayItem("prerequisites", prerequisiteInput, setPrerequisiteInput)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Learning Objectives</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("learningObjectives")?.map((objective) => (
                          <Badge key={objective} variant="secondary" className="flex items-center gap-1">
                            {objective}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeArrayItem("learningObjectives", objective)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add learning objective..."
                          value={objectiveInput}
                          onChange={(e) => setObjectiveInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("learningObjectives", objectiveInput, setObjectiveInput))}
                        />
                        <Button type="button" variant="outline" onClick={() => addArrayItem("learningObjectives", objectiveInput, setObjectiveInput)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Materials to Bring</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("materials")?.map((material) => (
                          <Badge key={material} variant="secondary" className="flex items-center gap-1">
                            {material}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeArrayItem("materials", material)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add material..."
                          value={materialInput}
                          onChange={(e) => setMaterialInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("materials", materialInput, setMaterialInput))}
                        />
                        <Button type="button" variant="outline" onClick={() => addArrayItem("materials", materialInput, setMaterialInput)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Materials Provided</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("materialsProvided")?.map((material) => (
                          <Badge key={material} variant="secondary" className="flex items-center gap-1">
                            {material}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeArrayItem("materialsProvided", material)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add provided material..."
                          value={providedMaterialInput}
                          onChange={(e) => setProvidedMaterialInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("materialsProvided", providedMaterialInput, setProvidedMaterialInput))}
                        />
                        <Button type="button" variant="outline" onClick={() => addArrayItem("materialsProvided", providedMaterialInput, setProvidedMaterialInput)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {tabErrors.requirements && tabErrors.requirements.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {tabErrors.requirements.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Event Organizers */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Event Organizers
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Add teams or users as co-organizers for this event
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="organizers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Co-Organizers</FormLabel>
                              <div className="space-y-3">
                                {field.value?.map((organizer, index) => (
                                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {organizer.organizerType === "team" 
                                          ? teams.find(t => t.id === organizer.organizerId)?.name || "Unknown Team"
                                          : "You (Event Creator)"
                                        }
                                      </div>
                                      <div className="text-sm text-muted-foreground capitalize">
                                        {organizer.role.replace("_", " ")}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newOrganizers = field.value?.filter((_, i) => i !== index) || []
                                        field.onChange(newOrganizers)
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                
                                {teams.length > 0 && (
                                  <div className="space-y-2">
                                    <Select
                                      onValueChange={(teamId) => {
                                        const team = teams.find(t => t.id === teamId)
                                        if (team && !field.value?.some(o => o.organizerId === teamId)) {
                                          const newOrganizers = [
                                            ...(field.value || []),
                                            {
                                              organizerType: "team" as const,
                                              organizerId: teamId,
                                              role: "co_organizer" as const
                                            }
                                          ]
                                          field.onChange(newOrganizers)
                                        }
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Add a team as co-organizer..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {teams
                                          .filter(team => !field.value?.some(o => o.organizerId === team.id))
                                          .map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                  <span className="text-xs font-medium">
                                                    {team.name.charAt(0).toUpperCase()}
                                                  </span>
                                                </div>
                                                {team.name}
                                              </div>
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                
                                {loadingTeams && (
                                  <div className="text-sm text-muted-foreground text-center py-2">
                                    Loading teams...
                                  </div>
                                )}
                                
                                {!loadingTeams && teams.length === 0 && (
                                  <div className="text-sm text-muted-foreground text-center py-2">
                                    <div>No teams available.</div>
                                    <div className="mt-1">
                                      <a 
                                        href="/teams" 
                                        className="text-blue-500 hover:underline"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Create a team first
                                      </a> to add as co-organizer.
                                    </div>
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
                
                {tabErrors.contact && tabErrors.contact.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {tabErrors.contact.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-between space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              
              <div className="flex space-x-2">
                {activeTab !== "basic" && (
                  <Button type="button" variant="outline" onClick={handlePrevious}>
                    Previous
                  </Button>
                )}
                
                {activeTab !== "contact" ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <LoadingButton 
                    type="button" 
                    onClick={handleCreate} 
                    loading={loading}
                    loadingText="Creating Event..."
                    error={submitError}
                    onRetry={() => setSubmitError(null)}
                  >
                    Create Event
                  </LoadingButton>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
