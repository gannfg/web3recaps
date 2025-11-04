'use client';

import { useState, useEffect } from 'react';
import { NewsArticleComment } from '@/lib/news-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, Heart, Reply, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import { useApi } from '@/hooks/use-api';

interface NewsArticleCommentsProps {
  articleId: string;
  slug: string;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
}

export function NewsArticleComments({
  articleId,
  slug,
  commentCount,
  onCommentCountChange,
}: NewsArticleCommentsProps) {
  const [comments, setComments] = useState<NewsArticleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const { execute } = useApi();

  useEffect(() => {
    loadComments();
  }, [slug]);

  const loadComments = async () => {
    try {
      setLoading(true);
      console.log('Loading comments for slug:', slug);
      const result = await execute(`/api/news/${slug}/comments`);
      console.log('Comments API result:', result);
      if (result.success && result.data) {
        console.log('Comments data:', result.data.comments);
        const comments = result.data.comments || [];
        
        // Check like status for each comment
        const commentsWithLikeStatus = await Promise.all(
          comments.map(async (comment: NewsArticleComment) => {
            try {
              const likeResult = await execute(`/api/news/${slug}/comments/${comment.id}/like`);
              console.log('Like status for comment', comment.id, ':', likeResult);
              return {
                ...comment,
                is_liked: likeResult.success ? likeResult.data?.liked : false
              };
            } catch (error) {
              console.error('Error checking like status for comment:', comment.id, error);
              return { ...comment, is_liked: false };
            }
          })
        );
        
        console.log('Comments with like status:', commentsWithLikeStatus);
        setComments(commentsWithLikeStatus);
      } else {
        console.log('Failed to load comments:', result.error);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const result = await execute(`/api/news/${slug}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (result.success) {
        setNewComment('');
        loadComments();
        onCommentCountChange(commentCount + 1);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    try {
      const result = await execute(`/api/news/${slug}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyText.trim(),
          parent_id: parentId,
        }),
      });

      if (result.success) {
        setReplyText('');
        setReplyingTo(null);
        loadComments();
        onCommentCountChange(commentCount + 1);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    console.log('Like button clicked for comment:', commentId);
    try {
      console.log('Calling API for comment like:', `/api/news/${slug}/comments/${commentId}/like`);
      const result = await execute(`/api/news/${slug}/comments/${commentId}/like`, {
        method: 'POST',
      });

      console.log('Like API result:', result);

      if (result.success) {
        console.log('Updating comment state with:', result);
        // Update the comment in the local state
        setComments(prevComments => {
          const updatedComments = prevComments.map(comment => {
            if (comment.id === commentId) {
              const updatedComment = {
                ...comment,
                is_liked: result.data?.liked,
                like_count: result.data?.likeCount || comment.like_count
              };
              console.log('Updated comment:', updatedComment);
              return updatedComment;
            }
            // Also update replies
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(reply => 
                  reply.id === commentId 
                    ? { ...reply, is_liked: result.data?.liked, like_count: result.data?.likeCount || reply.like_count }
                    : reply
                )
              };
            }
            return comment;
          });
          console.log('All comments after update:', updatedComments);
          return updatedComments;
        });
      } else {
        console.log('Like API failed:', result.error);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const renderComment = (comment: NewsArticleComment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-4' : ''}`}>
      <div className="bg-muted rounded-lg p-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={comment.author?.avatar_url} />
            <AvatarFallback>
              {comment.author?.display_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">
                {comment.author?.display_name || 'Anonymous'}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-foreground break-words">{comment.content}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-6 px-2 ${comment.is_liked ? 'text-blue-500' : ''}`}
          onClick={() => {
            console.log('Like button clicked for comment:', comment.id, 'is_liked:', comment.is_liked);
            handleLikeComment(comment.id);
          }}
        >
          <ThumbsUp className={`h-3 w-3 mr-1 ${comment.is_liked ? 'fill-current' : ''}`} />
          {comment.like_count}
        </Button>
        {!isReply && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => setReplyingTo(comment.id)}
          >
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        )}
      </div>
      
      {/* Reply Form */}
      {replyingTo === comment.id && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitReply(comment.id);
              }}
              className="mt-3"
            >
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="mb-2"
                rows={2}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Reply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
          
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({commentCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="mb-6">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="mb-3"
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!newComment.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comments List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="bg-muted rounded-lg p-3 animate-pulse">
                    <div className="h-4 bg-muted-foreground/20 rounded mb-2" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
