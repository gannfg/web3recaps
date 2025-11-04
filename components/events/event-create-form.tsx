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
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { X, Plus } from "lucide-react"
import { useState } from "react"
import type { Event } from "@/lib/types"

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  type: z.enum(["workshop", "1on1", "study_group", "hackathon"]),
  location: z.string().min(1, "Location is required"),
  capacityType: z.enum(["limited", "unlimited", "invite_only"]),
  maxAttendees: z.number().min(1, "Max attendees must be at least 1"),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "all"]),
  xpReward: z.number().min(0, "XP reward cannot be negative"),
  tags: z.array(z.string()).max(5, "Maximum 5 tags allowed"),
  isPublic: z.boolean(),
})

type EventData = z.infer<typeof eventSchema>

const EVENT_TYPES = [
  { value: "workshop", label: "Workshop", description: "Educational session", xp: 70 },
  { value: "1on1", label: "1-on-1 Session", description: "Personal mentoring", xp: 30 },
  { value: "study_group", label: "Study Group", description: "Collaborative learning", xp: 50 },
  { value: "hackathon", label: "Hackathon", description: "Building competition", xp: 100 },
] as const

const SUGGESTED_TAGS = [
  "solana",
  "rust",
  "react",
  "typescript",
  "defi",
  "nft",
  "web3",
  "dapp",
  "smart-contracts",
  "anchor",
  "beginner-friendly",
  "hands-on",
  "theory",
  "practical",
]

interface EventCreateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventCreated?: (event: Event) => void
}

export function EventCreateForm({ open, onOpenChange, onEventCreated }: EventCreateFormProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()
  const [newTag, setNewTag] = useState("")

  const form = useForm<EventData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      startTime: "19:00",
      endTime: "21:00",
      type: "workshop",
      location: "online",
      capacityType: "limited",
      maxAttendees: 20,
      skillLevel: "all",
      xpReward: 70,
      tags: [],
      isPublic: true,
    },
  })

  const tags = form.watch("tags")
  const eventType = form.watch("type")
  const capacityType = form.watch("capacityType")

  // Update XP reward when event type changes
  const handleTypeChange = (type: EventData["type"]) => {
    const eventTypeData = EVENT_TYPES.find((t) => t.value === type)
    if (eventTypeData) {
      form.setValue("xpReward", eventTypeData.xp)
    }
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 5) {
      form.setValue("tags", [...tags, tag])
    }
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      tags.filter((tag) => tag !== tagToRemove),
    )
  }

  const onSubmit = async (data: EventData) => {
    if (!user) return

    const result = await execute("/api/events", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success && result.data) {
      form.reset()
      onOpenChange(false)
      onEventCreated?.(result.data)
      toast({
        title: "Event created!",
        description: "Your event has been published to the community.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>Share knowledge and build connections with the community.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Solana Smart Contract Workshop" {...field} />
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
                      placeholder="Describe what participants will learn or do..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        handleTypeChange(value as EventData["type"])
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-muted-foreground">{type.description}</div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
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

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., online, Yogyakarta Tech Hub, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select capacity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="limited">Limited Capacity</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="invite_only">Invite Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {capacityType === "limited" && (
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
                          {...field}
                          onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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
                      {...field}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags section */}
            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTag(newTag)
                    }
                  }}
                />
                <Button type="button" onClick={() => addTag(newTag)} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag))
                  .slice(0, 8)
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Public Event</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Make this event visible to all community members
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Event</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
