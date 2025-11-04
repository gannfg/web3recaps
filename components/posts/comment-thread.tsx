"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/utils"
import { Heart, Reply, Send } from "lucide-react"
import type { Comment, User } from "@/lib/types"

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
})

type CommentData = z.infer<typeof commentSchema>

interface CommentItemProps {
  comment: Comment
  author: User
  onReply?: (commentId: string) => void
  onLike?: (commentId: string) => void
  level?: number
}

function CommentItem({ comment, author, onReply, onLike, level = 0 }: CommentItemProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(comment.likesCount)
  const [showReplyForm, setShowReplyForm] = useState(false)

  const handleLike = async () => {
    if (!user) return

    const result = await execute(`/api/comments/${comment.id}/like`, {
      method: "POST",
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success) {
      setIsLiked(!isLiked)
      setLikesCount(isLiked ? likesCount - 1 : likesCount + 1)
      onLike?.(comment.id)
    }
  }

  return (
    <div className={`${level > 0 ? "ml-8 border-l-2 border-muted pl-4" : ""}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.avatarUrl || "/placeholder.svg"} />
          <AvatarFallback>{author.displayName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{author.displayName || "Anonymous"}</p>
            <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-pretty">{comment.content}</p>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`h-auto p-0 text-xs ${isLiked ? "text-red-600" : "text-muted-foreground"}`}
            >
              <Heart className={`h-3 w-3 mr-1 ${isLiked ? "fill-current" : ""}`} />
              {likesCount > 0 && likesCount}
            </Button>
            {level < 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="h-auto p-0 text-xs text-muted-foreground"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>
          {showReplyForm && (
            <CommentForm
              postId=""
              parentCommentId={comment.id}
              onCommentAdded={() => setShowReplyForm(false)}
              placeholder="Write a reply..."
              compact
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface CommentFormProps {
  postId: string
  parentCommentId?: string
  onCommentAdded?: (comment: Comment) => void
  placeholder?: string
  compact?: boolean
}

function CommentForm({ postId, parentCommentId, onCommentAdded, placeholder, compact }: CommentFormProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()

  const form = useForm<CommentData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  })

  const onSubmit = async (data: CommentData) => {
    if (!user) return

    const result = await execute(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        parentCommentId,
      }),
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success && result.data) {
      form.reset()
      onCommentAdded?.(result.data)
      toast({
        title: "Comment added!",
        description: "Your comment has been posted.",
      })
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Connect your wallet to join the conversation</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardContent className={compact ? "p-0" : "p-4"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl || "/placeholder.svg"} />
                <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={placeholder || "Add a comment..."}
                          className="min-h-[80px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="flex items-center gap-2">
                <Send className="h-3 w-3" />
                Comment
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

interface CommentThreadProps {
  postId: string
  comments: Comment[]
  users: Record<string, User>
  onCommentAdded?: (comment: Comment) => void
}

export function CommentThread({ postId, comments, users, onCommentAdded }: CommentThreadProps) {
  // Group comments by parent
  const topLevelComments = comments.filter((comment) => !comment.parentCommentId)
  const repliesByParent = comments.reduce(
    (acc, comment) => {
      if (comment.parentCommentId) {
        if (!acc[comment.parentCommentId]) {
          acc[comment.parentCommentId] = []
        }
        acc[comment.parentCommentId].push(comment)
      }
      return acc
    },
    {} as Record<string, Comment[]>,
  )

  return (
    <div className="space-y-6">
      <CommentForm postId={postId} onCommentAdded={onCommentAdded} />

      <div className="space-y-4">
        {topLevelComments.map((comment) => (
          <div key={comment.id} className="space-y-3">
            <CommentItem comment={comment} author={users[comment.authorId]} />
            {repliesByParent[comment.id] && (
              <div className="space-y-3">
                {repliesByParent[comment.id].map((reply) => (
                  <CommentItem key={reply.id} comment={reply} author={users[reply.authorId]} level={1} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
