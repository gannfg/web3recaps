import { createSupabaseServer } from './supabase/server';
import { createNotification } from './notification-service';

export interface EventReminder {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  location?: string;
  attendeeIds: string[];
  hoursUntil: 24 | 6;
}

/**
 * Schedule event reminder emails for 24h and 6h before event
 */
export async function scheduleEventReminders(
  eventId: string, 
  eventDate: Date, 
  attendeeIds: string[]
): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get event details
    const { data: event, error } = await supabase
      .from('events')
      .select('id, title, event_date, start_time, location')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      console.error('Error fetching event for reminders:', error);
      return false;
    }

    // Create reminder records in database
    const reminders = [
      {
        event_id: eventId,
        hours_before: 24,
        scheduled_for: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      },
      {
        event_id: eventId,
        hours_before: 6,
        scheduled_for: new Date(eventDate.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }
    ];

    const { error: insertError } = await supabase
      .from('event_reminders')
      .insert(reminders);

    if (insertError) {
      console.error('Error creating reminder records:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in scheduleEventReminders:', error);
    return false;
  }
}

/**
 * Cancel event reminder emails
 */
export async function cancelEventReminders(eventId: string): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('event_reminders')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error cancelling reminders:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in cancelEventReminders:', error);
    return false;
  }
}

/**
 * Send event reminder (called by cron job)
 */
export async function sendEventReminder(
  eventId: string, 
  hoursUntil: 24 | 6
): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, event_date, start_time, location')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Error fetching event:', eventError);
      return false;
    }

    // Get confirmed attendees
    const { data: attendees, error: attendeesError } = await supabase
      .from('event_attendees')
      .select('user_id, users(email, display_name)')
      .eq('event_id', eventId)
      .eq('status', 'confirmed');

    if (attendeesError || !attendees) {
      console.error('Error fetching attendees:', attendeesError);
      return false;
    }

    if (attendees.length === 0) {
      console.log('No confirmed attendees for event:', eventId);
      return true;
    }

    // Create in-app notifications
    const attendeeIds = attendees.map(attendee => attendee.user_id);
    await createNotification({
      userId: '', // Will be set per attendee
      type: hoursUntil === 24 ? 'event_reminder_24h' : 'event_reminder_6h',
      title: `Event Reminder (${hoursUntil}h)`,
      message: `"${event.title}" starts in ${hoursUntil} hours at ${event.event_date} ${event.start_time}${event.location ? ` - ${event.location}` : ''}`,
      actionUrl: `/events/${eventId}`,
      entityType: 'event',
      entityId: eventId,
      emailRequired: true
    });

    // Send email notifications
    const emailPromises = attendees.map(async (attendee) => {
      const user = attendee.users as any;
      if (!user?.email) return;

      // Create in-app notification for this user
      await createNotification({
        userId: attendee.user_id,
        type: hoursUntil === 24 ? 'event_reminder_24h' : 'event_reminder_6h',
        title: `Event Reminder (${hoursUntil}h)`,
        message: `"${event.title}" starts in ${hoursUntil} hours at ${event.event_date} ${event.start_time}${event.location ? ` - ${event.location}` : ''}`,
        actionUrl: `/events/${eventId}`,
        entityType: 'event',
        entityId: eventId,
        emailRequired: true
      });

      // TODO: Send actual email here
      // For now, just log the email that would be sent
      console.log(`Would send ${hoursUntil}h reminder email to ${user.email} for event "${event.title}"`);
    });

    await Promise.all(emailPromises);

    // Mark reminder as sent
    await supabase
      .from('event_reminders')
      .update({ status: 'sent' })
      .eq('event_id', eventId)
      .eq('hours_before', hoursUntil);

    return true;
  } catch (error) {
    console.error('Error in sendEventReminder:', error);
    return false;
  }
}

/**
 * Get pending reminders that need to be sent
 */
export async function getPendingReminders(): Promise<EventReminder[]> {
  const supabase = createSupabaseServer();
  if (!supabase) return [];

  try {
    const now = new Date().toISOString();
    
    const { data: reminders, error } = await supabase
      .from('event_reminders')
      .select(`
        event_id,
        hours_before,
        events!inner(
          id,
          title,
          event_date,
          start_time,
          location
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (error) {
      console.error('Error fetching pending reminders:', error);
      return [];
    }

    // Get attendees for each event
    const reminderPromises = reminders.map(async (reminder) => {
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('user_id')
        .eq('event_id', reminder.event_id)
        .eq('status', 'confirmed');

      return {
        eventId: reminder.event_id,
        eventTitle: (reminder.events as any).title,
        eventDate: (reminder.events as any).event_date,
        startTime: (reminder.events as any).start_time,
        location: (reminder.events as any).location,
        attendeeIds: attendees?.map(a => a.user_id) || [],
        hoursUntil: reminder.hours_before as 24 | 6
      };
    });

    return Promise.all(reminderPromises);
  } catch (error) {
    console.error('Error in getPendingReminders:', error);
    return [];
  }
}
