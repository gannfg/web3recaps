import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { X, Plus, MapPin, Globe, Users, Clock, DollarSign, Tag, BookOpen, Target, Package, Upload, Image as ImageIcon } from "lucide-react"
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
  socialLinks: z.record(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
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
  { value: "social", label: "Social Event", description: "Connect and network with others", xp: 15, icon: "" },
  { value: "workshop", label: "Workshop", description: "Hands-on learning session", xp: 50, icon: "" },
  { value: "1on1", label: "1-on-1 Session", description: "Personal mentoring or coaching", xp: 30, icon: "" },
  { value: "study_group", label: "Study Group", description: "Collaborative learning", xp: 25, icon: "" },
  { value: "hackathon", label: "Hackathon", description: "Intensive coding competition", xp: 100, icon: "" },
  { value: "meetup", label: "Meetup", description: "Casual gathering of like-minded people", xp: 20, icon: "" },
  { value: "conference", label: "Conference", description: "Large-scale professional event", xp: 80, icon: "" },
  { value: "networking", label: "Networking", description: "Professional networking event", xp: 15, icon: "" },
]

interface EnhancedEventEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  onEventUpdated: (event: Event) => void
}

export function EnhancedEventEditForm({ open, onOpenChange, event, onEventUpdated }: EnhancedEventEditFormProps) {
  const { user } = useSession()
  const { execute, loading } = useApi()
  const { toast } = useToast()
  const [tagInput, setTagInput] = useState("")
  const [requirementInput, setRequirementInput] = useState("")
  const [materialInput, setMaterialInput] = useState("")
  const [prerequisiteInput, setPrerequisiteInput] = useState("")
  const [objectiveInput, setObjectiveInput] = useState("")
  const [providedMaterialInput, setProvidedMaterialInput] = useState("")
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null)
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
      maxAttendees: 10,
      skillLevel: "all",
      xpReward: 20,
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

  // Load teams when form opens
  useEffect(() => {
    if (open && user) {
      loadTeams()
    }
  }, [open, user])

  // Populate form when event changes
  useEffect(() => {
    if (event && open) {
      form.reset({
        title: event.title || "",
        description: event.description || "",
        eventDate: event.eventDate || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        eventType: event.eventType || "marketing",
        location: event.location || "",
        locationType: event.locationType || "physical",
        capacityType: event.capacityType || "limited",
        maxAttendees: event.maxAttendees || 10,
        skillLevel: event.skillLevel || "all",
        xpReward: event.xpReward || 20,
        tags: event.tags || [],
        requirements: event.requirements || [],
        materials: event.materials || [],
        cost: event.cost || 0,
        currency: event.currency || "USD",
        ageRestriction: event.ageRestriction || "",
        prerequisites: event.prerequisites || [],
        learningObjectives: event.learningObjectives || [],
        materialsProvided: event.materialsProvided || [],
        contactPhone: event.contactPhone || "",
        isPublic: event.isPublic ?? true,
        isRecurring: event.isRecurring ?? false,
        isFeatured: event.isFeatured ?? false,
        externalUrl: event.externalUrl || "",
        organizers: event.organizers || [],
      })
    }
  }, [event, open, form])

  const loadTeams = async () => {
    if (!user) return
    
    setLoadingTeams(true)
    try {
      const result = await execute("/api/teams", {
        headers: {
          "x-user-id": user.id,
        },
      })
      console.log("Teams API result (edit form):", result)
      if (result.success && result.data) {
        // The teams API returns data.teams when no member filter, data directly when member filter
        const teamsData = result.data.teams || result.data || []
        console.log("Teams data (edit form):", teamsData)
        setTeams(teamsData)
      } else {
        console.log("Teams API failed (edit form):", result.error)
      }
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoadingTeams(false)
    }
  }

  const addArrayItem = (fieldName: keyof EventData, value: string, setter: (value: string) => void) => {
    if (value.trim()) {
      const currentArray = form.getValues(fieldName) as string[] || []
      if (!currentArray.includes(value.trim())) {
        form.setValue(fieldName, [...currentArray, value.trim()] as any)
        setter("")
      }
    }
  }

  const removeArrayItem = (fieldName: keyof EventData, item: string) => {
    const currentArray = form.getValues(fieldName) as string[] || []
    form.setValue(fieldName, currentArray.filter(i => i !== item) as any)
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

  const onSubmit = async (data: EventData) => {
    if (!user || !event) return

    try {
      // Upload images if files are selected
      if (bannerImageFile) {
        console.log("Uploading banner image...")
        data.bannerImage = await uploadImage(bannerImageFile, 'banner')
      }
      if (logoImageFile) {
        console.log("Uploading logo image...")
        data.logoImage = await uploadImage(logoImageFile, 'logo')
      }
      if (coverImageFile) {
        console.log("Uploading cover image...")
        data.coverImage = await uploadImage(coverImageFile, 'cover')
      }

      const result = await execute(`/api/events/${event.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(data),
      })

      if (result.success && result.data) {
        onEventUpdated(result.data)
        onOpenChange(false)
        toast({
          title: "Success",
          description: "Event updated successfully!",
        })
      } else {
        throw new Error(result.error || "Failed to update event")
      }
    } catch (error) {
      console.error("Error updating event:", error)
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      })
    }
  }

  const selectedEventType = EVENT_TYPES.find(type => type.value === form.watch("eventType"))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
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
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter event title..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={selectedEventType?.description || "Describe your event..."}
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Type</FormLabel>
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
                                      <span className="text-lg flex-shrink-0">{type.icon}</span>
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

                      <FormField
                        control={form.control}
                        name="skillLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skill Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select skill level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                                <SelectItem value="all">All Levels</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
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
                            <FormLabel>End Time</FormLabel>
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
                            <FormLabel>Location Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="physical">Physical</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
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
                            <FormLabel>Capacity</FormLabel>
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
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter location or meeting link..." {...field} />
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
                            <FormLabel>Max Attendees</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Enter max attendees..."
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Event Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost (USD)</FormLabel>
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
                        name="xpReward"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>XP Reward</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="20"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
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
                          <FormLabel>Age Restriction (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 18+, 21+, All Ages" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Event Settings</div>
                          <div className="text-sm text-muted-foreground">Configure event visibility and features</div>
                        </div>
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
                                  Anyone can see and join this event
                                </div>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                                  This event happens regularly
                                </div>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                                  Highlight this event in the platform
                                </div>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Requirements & Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel>Tags</FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("tags")?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeArrayItem("tags", tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addArrayItem("tags", tagInput, setTagInput))}
                        />
                        <Button type="button" variant="outline" onClick={() => addArrayItem("tags", tagInput, setTagInput)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

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
                      <FormLabel>Materials Needed</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="externalUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>External URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
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
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
