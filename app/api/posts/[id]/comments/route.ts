import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { z } from "zod"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
import { checkAndRecordAction } from '@/lib/rate-limiting';
import { notifyPostEngagement } from '@/lib/notification-service';

const commentSchema = z.object({
  content: z.string().min(1).max(280),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Get comments for this post
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        author_id,
        created_at,
        users!post_comments_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ success: false, error: "Failed to fetch comments" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: comments?.map(comment => ({
        id: comment.id,
        content: comment.content,
        authorId: comment.author_id,
        author: {
          id: (comment.users as any).id,
          name: (comment.users as any).display_name || "Anonymous",
          avatar: (comment.users as any).avatar_url,
        },
        createdAt: comment.created_at,
      })) || []
    })

  } catch (error) {
    console.error("Fetch comments error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch comments" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    
    // Use requireUser for consistent authentication
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      console.error('Comment API: User not authenticated')
      return NextResponse.json({ success: false, error: "User not authenticated. Please log in." }, { status: 401 })
    }
    const userId = auth.user.id
    const supabase = auth.supabase

    const body = await request.json()
    const { content } = commentSchema.parse(body)

    // Skip rate limiting for now - it's causing issues
    // Rate limiting can be re-enabled later once the database function is working properly
    // const rateLimitResult = await checkAndRecordAction(userId, 'comment_post', {
    //   cooldownMs: 5000,
    //   dailyLimit: 50
    // });

    // Get the post's short_id and author_id
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('short_id, author_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: userId,
        post_short_id: parseInt(post.short_id),
        content: content.trim(),
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        content,
        author_id,
        created_at,
        users!post_comments_author_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return NextResponse.json({ success: false, error: "Failed to create comment" }, { status: 500 })
    }

    // Award XP for commenting on the post
    awardXp(userId, XP_VALUES.COMMENT_POST, "Commented on post", { postId, commentId: comment.id }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Notify post author about the comment
    notifyPostEngagement(postId, post.author_id, userId, 'post_comment').catch(() => {
      // Silently fail - notifications are not critical
    });

    // Update comments count
    const { data: currentPost } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', postId)
      .single()

    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        comments_count: (currentPost?.comments_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (updateError) {
      console.error('Update comments count error:', updateError)
      // Don't fail the request, just log the error
    }

    // Get the updated comment count
    const { data: updatedPost } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', postId)
      .single()

    return NextResponse.json({ 
      success: true, 
      data: {
        id: comment.id,
        content: comment.content,
        authorId: comment.author_id,
        author: {
          id: (comment.users as any).id,
          name: (comment.users as any).display_name || "Anonymous",
          avatar: (comment.users as any).avatar_url,
        },
        createdAt: comment.created_at,
        updatedCommentsCount: updatedPost?.comments_count || 0,
      }
    })

  } catch (error) {
    console.error("Create comment error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create comment" },
      { status: 500 }
    )
  }
}