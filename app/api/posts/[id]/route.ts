import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    const supabase = createSupabaseServer()
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    // supabase already initialized above

    // First, get the post data including media URLs
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id, images, videos')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }

    if (post.author_id !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized to delete this post" }, { status: 403 })
    }

    // Delete associated media from Supabase storage using admin client
    const adminSupabase = createSupabaseAdmin()
    if (adminSupabase) {
      try {
        console.log('Post data for deletion:', { images: post.images, videos: post.videos })
        
        // Delete images
        if (post.images && Array.isArray(post.images)) {
          for (const imageUrl of post.images) {
            if (imageUrl && typeof imageUrl === 'string') {
              console.log('Processing image URL:', imageUrl)
              
              // Extract the file path from the URL
              const urlParts = imageUrl.split('/')
              const bucketName = 'post-images'
              
              // Find the index of the bucket name and get everything after it
              const bucketIndex = urlParts.findIndex(part => part === bucketName)
              if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                const filePath = urlParts.slice(bucketIndex + 1).join('/')
                console.log('Extracted file path:', filePath)
                
                const { data: deleteResult, error: imageDeleteError } = await adminSupabase.storage
                  .from(bucketName)
                  .remove([filePath])
                
                console.log('Delete result:', deleteResult)
                
                if (imageDeleteError) {
                  console.error('Error deleting image:', imageDeleteError)
                } else {
                  console.log('Successfully deleted image:', filePath)
                }
              } else {
                console.error('Could not extract file path from URL:', imageUrl)
              }
            }
          }
        }

        // Delete videos
        if (post.videos && Array.isArray(post.videos)) {
          for (const videoUrl of post.videos) {
            if (videoUrl && typeof videoUrl === 'string') {
              console.log('Processing video URL:', videoUrl)
              
              // Extract the file path from the URL
              const urlParts = videoUrl.split('/')
              const bucketName = 'post-videos'
              
              // Find the index of the bucket name and get everything after it
              const bucketIndex = urlParts.findIndex(part => part === bucketName)
              if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                const filePath = urlParts.slice(bucketIndex + 1).join('/')
                console.log('Extracted video file path:', filePath)
                
                const { data: deleteResult, error: videoDeleteError } = await adminSupabase.storage
                  .from(bucketName)
                  .remove([filePath])
                
                console.log('Video delete result:', deleteResult)
                
                if (videoDeleteError) {
                  console.error('Error deleting video:', videoDeleteError)
                } else {
                  console.log('Successfully deleted video:', filePath)
                }
              } else {
                console.error('Could not extract video file path from URL:', videoUrl)
              }
            }
          }
        }
      } catch (storageError) {
        console.error('Error deleting media from storage:', storageError)
        // Continue with post deletion even if storage cleanup fails
      }
    } else {
      console.warn('Admin Supabase client not available, skipping storage cleanup')
    }

    // Delete the post (this will cascade to related tables due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (deleteError) {
      console.error('Error deleting post:', deleteError)
      return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { deleted: true } })

  } catch (error) {
    console.error("Delete post error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete post" },
      { status: 500 }
    )
  }
}