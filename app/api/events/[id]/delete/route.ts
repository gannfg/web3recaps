import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    const supabase = createSupabaseServer()

    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = auth.user.id

    // First, fetch the event to get image URLs and verify ownership
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("id, creator_id, banner_image, logo_image, cover_image")
      .eq("id", eventId)
      .single()

    if (fetchError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Check if user is the creator of the event
    if (event.creator_id !== userId) {
      return NextResponse.json({ error: "Unauthorized to delete this event" }, { status: 403 })
    }

    // Delete images from Supabase storage
    const imagesToDelete = [
      event.banner_image,
      event.logo_image,
      event.cover_image
    ].filter(Boolean) // Remove null/undefined values

    if (imagesToDelete.length > 0) {
      for (const imageUrl of imagesToDelete) {
        try {
          // Extract the file path from the URL
          const urlParts = imageUrl.split('/storage/v1/object/public/event-images/')
          if (urlParts.length === 2) {
            const filePath = urlParts[1]
            
            const { error: deleteError } = await supabase.storage
              .from('event-images')
              .remove([filePath])
            
            if (deleteError) {
              console.error(`Failed to delete image ${filePath}:`, deleteError)
            }
          }
        } catch (error) {
          console.error(`Error deleting image ${imageUrl}:`, error)
        }
      }
    }

    // Delete the event from database
    const { error: deleteEventError } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)

    if (deleteEventError) {
      console.error("Failed to delete event:", deleteEventError)
      return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Event deleted successfully" })

  } catch (error) {
    console.error("Error deleting event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
