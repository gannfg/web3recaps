"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { X, Plus, Send, Link, Github, Figma } from "lucide-react"
import type { Post } from "@/lib/types"

const postSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  postType: z.enum(["project", "help", "showcase", "team", "general"]),
  tags: z.array(z.string()).max(5, "Maximum 5 tags allowed"),
  githubUrl: z.string().url().optional().or(z.literal("")),
  figmaUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
})

type PostData = z.infer<typeof postSchema>

const POST_TYPES = [
  { value: "general", label: "General Discussion", description: "Share thoughts and ideas" },
  { value: "project", label: "Project Update", description: "Share your project progress" },
  { value: "showcase", label: "Showcase", description: "Show off your work" },
  { value: "help", label: "Need Help", description: "Ask for assistance" },
  { value: "team", label: "Team Building", description: "Find collaborators" },
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
  "beginner",
  "intermediate",
  "advanced",
  "tutorial",
  "help",
  "showcase",
]

interface PostComposerProps {
  onPostCreated?: (post: Post) => void
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()
  const [newTag, setNewTag] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)

  const form = useForm<PostData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      postType: "general",
      tags: [],
      githubUrl: "",
      figmaUrl: "",
      websiteUrl: "",
    },
  })

  const tags = form.watch("tags")
  const postType = form.watch("postType")

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

  const onSubmit = async (data: PostData) => {
    if (!user) return

    const result = await execute("/api/posts", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success && result.data) {
      form.reset()
      setIsExpanded(false)
      onPostCreated?.(result.data)
      toast({
        title: "Post created!",
        description: "Your post has been shared with the community.",
      })
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Connect your wallet to share with the community</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl || "/placeholder.svg"} />
            <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.displayName || "Anonymous"}</p>
            <p className="text-sm text-muted-foreground">{user.rank}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isExpanded ? (
              <Textarea
                placeholder="What's on your mind? Share with the Solana community..."
                onClick={() => setIsExpanded(true)}
                className="min-h-[80px] resize-none cursor-pointer"
                readOnly
              />
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="postType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select post type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POST_TYPES.map((type) => (
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

                {(postType === "project" || postType === "showcase") && (
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Give your post a title..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share your thoughts, progress, or questions..."
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Links section for project/showcase posts */}
                {(postType === "project" || postType === "showcase") && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="githubUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Github className="h-4 w-4" />
                            GitHub
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="figmaUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Figma className="h-4 w-4" />
                            Figma
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://figma.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            Website
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

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

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setIsExpanded(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Share Post
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
