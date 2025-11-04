import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import type { ApiResponse, Event } from "@/lib/types"
import { notifyEventUpdate } from "@/lib/notification-service"

const updateEventSchema = z.object({
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    if (!eventId) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 })
    }

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    const { data: event, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        creator_id,
        event_date,
        start_time,
        end_time,
        event_type,
        location,
        location_type,
        max_attendees,
        current_attendees_count,
        waitlist_count,
        is_public,
        is_recurring,
        tags,
        requirements,
        materials,
        xp_reward,
        skill_level,
        status,
        capacity_type,
        cost,
        currency,
        age_restriction,
        prerequisites,
        learning_objectives,
        materials_provided,
        contact_phone,
        social_links,
        media_urls,
        banner_image,
        logo_image,
        cover_image,
        approval_status,
        is_featured,
        priority,
        external_url,
        registration_url,
        check_in_code,
        created_at,
        updated_at
      `)
      .eq("id", eventId)
      .single()

    if (error) {
      // Check if it's a specific error type
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
      }
      
      console.error("Error fetching event:", error.message || error)
      return NextResponse.json({ success: false, error: "Failed to fetch event" }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    // Get creator data separately (simplified)
    let creator = null
    if (event.creator_id) {
      try {
        const { data: creatorData } = await supabase
          .from("users")
          .select("id, display_name, avatar_url, role")
          .eq("id", event.creator_id)
          .single()
        
        if (creatorData) {
          creator = {
            id: creatorData.id,
            displayName: creatorData.display_name,
            avatarUrl: creatorData.avatar_url,
            role: creatorData.role
          }
        }
      } catch (error) {
        // Continue without creator data
      }
    }

    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      creatorId: event.creator_id,
      eventDate: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      eventType: event.event_type,
      location: event.location,
      locationType: event.location_type,
      maxAttendees: event.max_attendees,
      currentAttendeesCount: event.current_attendees_count,
      waitlistCount: event.waitlist_count,
      isPublic: event.is_public,
      isRecurring: event.is_recurring,
      tags: event.tags,
      requirements: event.requirements,
      materials: event.materials,
      xpReward: event.xp_reward,
      skillLevel: event.skill_level,
      status: event.status,
      capacityType: event.capacity_type,
      cost: event.cost,
      currency: event.currency,
      ageRestriction: event.age_restriction,
      prerequisites: event.prerequisites,
      learningObjectives: event.learning_objectives,
      materialsProvided: event.materials_provided,
      contactPhone: event.contact_phone,
      socialLinks: event.social_links,
      mediaUrls: event.media_urls,
      bannerImage: event.banner_image,
      logoImage: event.logo_image,
      coverImage: event.cover_image,
      approvalStatus: event.approval_status,
      isFeatured: event.is_featured,
      priority: event.priority,
      externalUrl: event.external_url,
      registrationUrl: event.registration_url,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      // Include related data
      creator,
      organizers: [] // Simplified - no organizers for now
    }

    const response = {
      success: true,
      data: formattedEvent,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in event GET API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    if (!eventId) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 })
    }

    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const body = await request.json()
    const eventData = updateEventSchema.parse(body)

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Check if user can edit this event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("creator_id")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    // Check if user is the creator or a team member of an organizing team
    const canEdit = await checkEditPermission(supabase, eventId, userId, event.creator_id)
    if (!canEdit) {
      return NextResponse.json({ success: false, error: "Not authorized to edit this event" }, { status: 403 })
    }

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update({
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.eventDate,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        event_type: eventData.eventType,
        location: eventData.location,
        location_type: eventData.locationType,
        max_attendees: eventData.maxAttendees,
        capacity_type: eventData.capacityType,
        cost: eventData.cost,
        currency: eventData.currency,
        age_restriction: eventData.ageRestriction,
        prerequisites: eventData.prerequisites,
        learning_objectives: eventData.learningObjectives,
        materials_provided: eventData.materialsProvided,
        contact_phone: eventData.contactPhone,
        social_links: eventData.socialLinks,
        media_urls: eventData.mediaUrls,
        banner_image: eventData.bannerImage,
        logo_image: eventData.logoImage,
        cover_image: eventData.coverImage,
        is_public: eventData.isPublic,
        is_recurring: eventData.isRecurring,
        is_featured: eventData.isFeatured,
        external_url: eventData.externalUrl,
        tags: eventData.tags,
        requirements: eventData.requirements,
        materials: eventData.materials,
        xp_reward: eventData.xpReward,
        skill_level: eventData.skillLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating event:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update event" }, { status: 500 })
    }

    // Update event organizers
    if (eventData.organizers && eventData.organizers.length > 0) {
      console.log("=== EVENT ORGANIZERS DEBUG ===")
      console.log("Event ID:", eventId)
      console.log("User ID:", userId)
      console.log("Organizers data:", eventData.organizers)
      
      // First, verify the event exists
      const { data: eventCheck, error: eventCheckError } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .single()
      
      if (eventCheckError || !eventCheck) {
        console.error("Event does not exist:", eventCheckError)
        return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
      }
      
      console.log("Event exists, proceeding with organizers update")
      
      // Use admin client for organizers operations to bypass RLS
      const adminSupabase = createSupabaseAdmin()
      if (!adminSupabase) {
        console.error("Admin Supabase client not available")
        return NextResponse.json({ success: false, error: "Admin access not available" }, { status: 500 })
      }

      // Delete existing organizers
      const { error: deleteError } = await adminSupabase
        .from("event_organizers")
        .delete()
        .eq("event_id", eventId)
      
      if (deleteError) {
        console.error("Error deleting existing organizers:", deleteError)
      }

      // Insert new organizers
      const organizersData = eventData.organizers.map(organizer => ({
        event_id: eventId,
        organizer_type: organizer.organizerType,
        organizer_id: organizer.organizerId,
        role: organizer.role,
        added_by: userId,
        added_at: new Date().toISOString(),
      }))

      console.log("Organizers data to insert:", organizersData)

      const { error: organizersError } = await adminSupabase
        .from("event_organizers")
        .insert(organizersData)

      if (organizersError) {
        console.error("Error updating event organizers:", organizersError)
        console.error("Full error details:", JSON.stringify(organizersError, null, 2))
        // Don't fail the entire request, just log the error
      } else {
        console.log("Successfully inserted organizers")
      }
    }

    // Format the response
    const formattedEvent: Event = {
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description,
      creatorId: updatedEvent.creator_id,
      eventDate: updatedEvent.event_date,
      startTime: updatedEvent.start_time,
      endTime: updatedEvent.end_time,
      eventType: updatedEvent.event_type,
      location: updatedEvent.location,
      locationType: updatedEvent.location_type,
      maxAttendees: updatedEvent.max_attendees,
      currentAttendeesCount: updatedEvent.current_attendees_count,
      waitlistCount: updatedEvent.waitlist_count,
      isPublic: updatedEvent.is_public,
      isRecurring: updatedEvent.is_recurring,
      tags: updatedEvent.tags,
      requirements: updatedEvent.requirements,
      materials: updatedEvent.materials,
      xpReward: updatedEvent.xp_reward,
      skillLevel: updatedEvent.skill_level,
      status: updatedEvent.status,
      capacityType: updatedEvent.capacity_type,
      cost: updatedEvent.cost,
      currency: updatedEvent.currency,
      ageRestriction: updatedEvent.age_restriction,
      prerequisites: updatedEvent.prerequisites,
      learningObjectives: updatedEvent.learning_objectives,
      materialsProvided: updatedEvent.materials_provided,
      contactPhone: updatedEvent.contact_phone,
      socialLinks: updatedEvent.social_links,
      mediaUrls: updatedEvent.media_urls,
      bannerImage: updatedEvent.banner_image,
      logoImage: updatedEvent.logo_image,
      coverImage: updatedEvent.cover_image,
      approvalStatus: updatedEvent.approval_status,
      isFeatured: updatedEvent.is_featured,
      priority: updatedEvent.priority,
      externalUrl: updatedEvent.external_url,
      registrationUrl: updatedEvent.registration_url,
      createdAt: updatedEvent.created_at,
      updatedAt: updatedEvent.updated_at,
    }

    // Notify all attendees about the event update
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed');

    if (attendees && attendees.length > 0) {
      const attendeeIds = attendees.map(attendee => attendee.user_id);
      notifyEventUpdate(eventId, attendeeIds, 'updated').catch(() => {
        // Silently fail - notifications are not critical
      });
    }

    const response: ApiResponse<Event> = {
      success: true,
      data: formattedEvent,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in event PUT API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

async function checkEditPermission(supabase: any, eventId: string, userId: string, creatorId: string): Promise<boolean> {
  // User is the creator
  if (userId === creatorId) return true

  // Check if user is a team member of an organizing team
  const { data: organizers } = await supabase
    .from("event_organizers")
    .select("organizer_type, organizer_id")
    .eq("event_id", eventId)
    .eq("organizer_type", "team")

  if (organizers && organizers.length > 0) {
    // Get team IDs
    const teamIds = organizers.map((org: any) => org.organizer_id)
    
    // Check if user is a member of any of these teams
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("team_id", teamIds)

    if (teamMembers && teamMembers.length > 0) {
      return true
    }
  }

  return false
}