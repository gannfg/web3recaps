import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateId } from "@/lib/utils"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
import type { Post, ApiResponse } from "@/lib/types"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

const createPostSchema = z.object({
  content: z.string().min(1, "Content is required"),
  postType: z.enum(["project", "help", "showcase", "team", "general"]).optional().default("general"),
  tags: z.array(z.string()).optional().default([]),
  githubUrl: z.string().optional().default(""),
  figmaUrl: z.string().optional().default(""),
  websiteUrl: z.string().optional().default(""),
  images: z.array(z.string()).optional().default([]),
  videos: z.array(z.string()).optional().default([]),
})

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postType = searchParams.get("type")
    const tag = searchParams.get("tag")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const supabase = createSupabaseServer()
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })

    let query = supabase
      .from("posts")
      .select("id, short_id, author_id, title, content, post_type, tags, github_url, figma_url, website_url, images, videos, likes_count, comments_count, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (postType && postType !== "all") query = query.eq("post_type", postType)
    if (tag) query = query.contains("tags", [tag])

    const { data, error, count } = await query
    if (error) throw error

    const posts: Post[] = (data || []).map((p: any) => ({
      id: p.id,
      shortId: p.short_id,
      authorId: p.author_id,
      title: p.title ?? undefined,
      content: p.content,
      postType: p.post_type,
      tags: p.tags ?? [],
      githubUrl: p.github_url ?? undefined,
      figmaUrl: p.figma_url ?? undefined,
      websiteUrl: p.website_url ?? undefined,
      images: p.images ?? [],
      videos: p.videos ?? [],
      likesCount: p.likes_count ?? 0,
      commentsCount: p.comments_count ?? 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))

    const response: ApiResponse<{ posts: Post[]; total: number; hasMore: boolean }> = {
      success: true,
      data: { posts, total: count ?? posts.length, hasMore: (offset + limit) < (count ?? posts.length) },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get posts error:", error)
    return NextResponse.json({ success: false, error: "Failed to get posts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const supabase = auth.supabase
    const userId = auth.user.id

    const body = await request.json()
    console.log("Request body:", body)
    
    const postData = createPostSchema.parse(body)
    console.log("Parsed post data:", postData)

    // supabase already created above

    // Get the next short_id by finding the highest existing short_id
    const { data: maxPost } = await supabase
      .from("posts")
      .select("short_id")
      .order("short_id", { ascending: false })
      .limit(1)
      .single()

    const shortId = (maxPost?.short_id || 0) + 1
    console.log("Next short ID:", shortId)

    const insertData = {
      author_id: userId,
      title: null, // No titles in simplified posts
      content: postData.content,
      post_type: postData.postType,
      tags: postData.tags || [],
      github_url: postData.githubUrl || null,
      figma_url: postData.figmaUrl || null,
      website_url: postData.websiteUrl || null,
      images: postData.images || [],
      videos: postData.videos || [],
      short_id: shortId,
      likes_count: 0,
      comments_count: 0,
    }
    
    console.log("Inserting post data:", insertData)

    // Insert the new post into the database
    const { data: newPost, error: insertError } = await supabase
      .from("posts")
      .insert(insertData)
      .select("id, short_id, author_id, title, content, post_type, tags, github_url, figma_url, website_url, images, videos, likes_count, comments_count, created_at, updated_at")
      .single()

    console.log("Insert result - data:", newPost, "error:", insertError)

    if (insertError) {
      console.error("Database insert error:", insertError)
      return NextResponse.json({ success: false, error: "Failed to create post" }, { status: 500 })
    }

    // Convert database response to Post type
    const post: Post = {
      id: newPost.id,
      shortId: newPost.short_id,
      authorId: newPost.author_id,
      title: newPost.title ?? undefined,
      content: newPost.content,
      postType: newPost.post_type,
      tags: newPost.tags ?? [],
      githubUrl: newPost.github_url ?? undefined,
      figmaUrl: newPost.figma_url ?? undefined,
      websiteUrl: newPost.website_url ?? undefined,
      images: newPost.images ?? [],
      videos: newPost.videos ?? [],
      likesCount: newPost.likes_count ?? 0,
      commentsCount: newPost.comments_count ?? 0,
      createdAt: newPost.created_at,
      updatedAt: newPost.updated_at,
    }

    // Award XP for creating a post (don't await to prevent blocking)
    // Database triggers will automatically update statistics
    // Award XP for creating a post (non-blocking, fire-and-forget)
    awardXp(userId, XP_VALUES.CREATE_POST, "Created post", { postId: post.id, postType: post.postType }).catch(() => {
      // Silently fail - XP will be handled by background processes
    })

    // Check if it's user's first post and award bonus
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)

    if (count === 1) {
      awardXp(userId, XP_VALUES.FIRST_POST, "First post created", {
        postId: post.id
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });
    }

    const response: ApiResponse<Post> = {
      success: true,
      data: post,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Create post error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create post" },
      { status: 400 },
    )
  }
}
