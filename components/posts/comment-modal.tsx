"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { toast } from "sonner"
import { Send } from "lucide-react"

interface Comment {
  id: string
  content: string
  authorId: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
}

interface CommentModalProps {
  postId: string
  postAuthor: string
  isOpen: boolean
  onClose: () => void
  comments: Comment[]
  onCommentAdded: (comment: Comment) => void
}

export function CommentModal({ 
  postId, 
  postAuthor, 
  isOpen, 
  onClose, 
  comments, 
  onCommentAdded 
}: CommentModalProps) {
  const { user } = useSession()
  const { execute, loading } = useApi()
  const [commentText, setCommentText] = useState("")

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty")
      return
    }
    
    if (!user) {
      toast.error("Please log in to comment")
      return
    }

    try {
      const result = await execute(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      })

      if (result.success) {
        // The API response already contains the correct author data
        onCommentAdded(result.data)
        setCommentText("")
        toast.success("Comment added!")
      } else {
        console.error('Comment error:', result.error)
        toast.error(result.error || "Failed to add comment")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add comment")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Comments
          </DialogTitle>
          <DialogDescription>
            View and add comments for this post
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {comments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3 p-3 border-b">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author.avatar} />
                  <AvatarFallback>
                    {comment.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">
                      {comment.author.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {user && (
          <div className="border-t pt-4">
            <div className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  {user.displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder={`Reply to ${postAuthor}...`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={280}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {commentText.length}/280
                  </span>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim() || loading}
                    size="sm"
                    className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
