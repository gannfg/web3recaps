import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { awardXp } from '@/lib/gamification';
import { XP_VALUES } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'published';
    const layout_position = searchParams.get('layout_position');
    const type = searchParams.get('type');
    const skillLevel = searchParams.get('skillLevel');
    const upcoming = searchParams.get('upcoming');
    const limit = searchParams.get('limit');
    const creator = searchParams.get('creator');

    let query = supabase
      .from('events')
      .select(`
        *,
        creator:users!events_creator_id_fkey(
          id,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('status', status);

    if (creator) {
      query = query.eq('creator_id', creator);
    }
    // Filter by layout position
    if (layout_position) {
      query = query.eq('layout_position', layout_position);
    }

    // Filter by event type
    if (type && type !== 'all') {
      query = query.eq('event_type', type);
    }

    // Filter by skill level
    if (skillLevel && skillLevel !== 'all') {
      query = query.eq('skill_level', skillLevel);
    }

    // Filter by upcoming events (future events only)
    if (upcoming === 'true') {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      console.log('Upcoming filter - today:', todayString);
      console.log('Current date object:', today);
      console.log('Current date ISO:', today.toISOString());
      console.log('Current year:', today.getFullYear());
      console.log('Current month:', today.getMonth() + 1);
      console.log('Current day:', today.getDate());
      
      // Use a more robust date comparison
      query = query.gte('event_date', todayString);
    }

    // Apply limit
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: events, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    console.log('=== EVENTS API DEBUG ===');
    console.log('Query params:', { status, layout_position, type, skillLevel, upcoming, limit });
    console.log('Raw events from DB:', events);
    console.log('Events count:', events?.length || 0);
    
    // Debug event dates
    if (events && events.length > 0) {
      events.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, {
          title: event.title,
          event_date: event.event_date,
          event_type: event.event_type
        });
      });
    }

    // Process events to map database fields to expected camelCase fields
    const processedEvents = (events || []).map(event => {
      // Use actual data from database, only provide minimal defaults
      const eventDate = event.event_date;
      const startTime = event.start_time;
      const endTime = event.end_time;
      const maxAttendees = event.max_attendees || 20;
      const currentAttendees = event.current_attendees_count || 0;
      
      return {
        ...event,
        // Map database snake_case to camelCase with realistic defaults
        eventDate: eventDate,
        // Include creator data
        creator: event.creator,
        startTime: startTime,
        endTime: endTime,
        eventType: event.event_type || 'meetup',
        locationType: event.location_type || 'physical',
        maxAttendees: maxAttendees,
        currentAttendeesCount: currentAttendees,
        waitlistCount: event.waitlist_count || 0,
        isPublic: event.is_public ?? true,
        isRecurring: event.is_recurring ?? false,
        xpReward: event.xp_reward || 20,
        skillLevel: event.skill_level || 'all',
        capacityType: event.capacity_type || 'limited',
        checkInCode: event.check_in_code || null,
        ageRestriction: event.age_restriction || null,
        learningObjectives: event.learning_objectives || [],
        materialsProvided: event.materials_provided || [],
        contactPhone: event.contact_phone || null,
        socialLinks: event.social_links || {},
        mediaUrls: event.media_urls || [],
        bannerImage: event.banner_image || null,
        logoImage: event.logo_image || null,
        coverImage: event.cover_image || event.banner_image || null,
        approvalStatus: event.approval_status || 'approved',
        approvedBy: event.approved_by || null,
        approvedAt: event.approved_at || null,
        rejectionReason: event.rejection_reason || null,
        isFeatured: event.is_featured ?? false,
        // Ensure required fields have defaults
        location: event.location || 'TBD',
      };
    });

    return NextResponse.json({
      success: true,
      data: { events: processedEvents }
    });

  } catch (error) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 });
    }

    const body = await request.json();
    console.log('Event creation data:', body);

    // Convert camelCase to snake_case for database
    const eventData = {
      title: body.title,
      description: body.description,
      event_date: body.eventDate,
      start_time: body.startTime,
      end_time: body.endTime,
      event_type: body.eventType,
      location: body.location,
      location_type: body.locationType,
      capacity_type: body.capacityType,
      max_attendees: body.maxAttendees,
      skill_level: body.skillLevel,
      xp_reward: body.xpReward,
      tags: body.tags || [],
      requirements: body.requirements || [],
      materials: body.materials || [],
      cost: body.cost || 0,
      currency: body.currency || 'USD',
      age_restriction: body.ageRestriction,
      prerequisites: body.prerequisites || [],
      learning_objectives: body.learningObjectives || [],
      materials_provided: body.materialsProvided || [],
      contact_phone: body.contactPhone,
      banner_image: body.bannerImage,
      logo_image: body.logoImage,
      cover_image: body.coverImage,
      is_public: body.isPublic ?? true,
      is_recurring: body.isRecurring ?? false,
      is_featured: body.isFeatured ?? false,
      external_url: body.externalUrl,
      creator_id: userId,
      status: 'published'
    };

    const { data: newEvent, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create event' },
        { status: 500 }
      );
    }

    console.log('Event created successfully:', newEvent);

    // Award XP for creating event
    awardXp(userId, XP_VALUES.HOST_EVENT, "Created event", { 
      eventId: newEvent.id,
      eventTitle: newEvent.title,
      eventType: newEvent.event_type
    }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Check if it's user's first event and award bonus
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId)

    if (count === 1) {
      awardXp(userId, XP_VALUES.FIRST_EVENT_HOST, "First event hosted", {
        eventId: newEvent.id
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });
    }

    // Handle organizers if provided
    if (body.organizers && body.organizers.length > 0) {
      const organizerData = body.organizers.map((organizer: any) => ({
        event_id: newEvent.id,
        organizer_type: organizer.organizerType,
        organizer_id: organizer.organizerId,
        role: organizer.role,
        added_by: userId
      }));

      const { error: organizerError } = await supabase
        .from('event_organizers')
        .insert(organizerData);

      if (organizerError) {
        console.error('Error adding organizers:', organizerError);
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: newEvent
    });

  } catch (error) {
    console.error('Error in event creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}