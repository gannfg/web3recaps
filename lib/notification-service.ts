import { createSupabaseServer } from './supabase/server';

export type NotificationType = 
  // Social notifications
  | 'post_like' | 'post_comment' | 'comment_like' | 'comment_reply' 
  | 'project_comment' | 'news_comment' | 'news_comment_reply'
  // Gamification notifications
  | 'level_up' | 'rank_up' | 'badge_unlocked' | 'streak_milestone'
  // Team notifications
  | 'team_invitation' | 'team_member_joined' | 'team_project_update' 
  | 'invitation_accepted' | 'invitation_declined'
  // Event notifications
  | 'event_reminder_24h' | 'event_reminder_6h' | 'event_booking_confirmed' 
  | 'event_cancelled' | 'event_waitlist_spot' | 'event_checkin_available'
  // Project notifications
  | 'project_like' | 'project_bookmark' | 'collaboration_invite'
  // System notifications
  | 'admin_announcement' | 'system_update' | 'xp_adjustment';

export type EntityType = 'post' | 'comment' | 'team' | 'event' | 'project' | 'news_article';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  actor_id?: string;
  entity_type?: EntityType;
  entity_id?: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actorId?: string; // Who triggered the notification
  entityType?: EntityType;
  entityId?: string;
  data?: any;
  emailRequired?: boolean; // For event notifications
}

/**
 * Create a single notification
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        actor_id: params.actorId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        data: params.data ? JSON.stringify(params.data) : null,
        read: false
      });

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return false;
  }
}

/**
 * Create multiple notifications in bulk
 */
export async function createBulkNotifications(notifications: CreateNotificationParams[]): Promise<number> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return 0;
  }

  try {
    const notificationData = notifications.map(notif => ({
      user_id: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      action_url: notif.actionUrl,
      actor_id: notif.actorId,
      entity_type: notif.entityType,
      entity_id: notif.entityId,
      data: notif.data ? JSON.stringify(notif.data) : null,
      read: false
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select('id');

    if (error) {
      console.error('Error creating bulk notifications:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in createBulkNotifications:', error);
    return 0;
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return 0;
  }
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Notification[]> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        type,
        title,
        message,
        action_url,
        actor_id,
        entity_type,
        entity_id,
        data,
        read,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data?.map(notif => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : null
    })) || [];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS BY CATEGORY
// ============================================================================

/**
 * Social Engagement Notifications
 */

export async function notifyPostEngagement(
  postId: string, 
  postAuthorId: string, 
  actorId: string, 
  type: 'post_like' | 'post_comment'
): Promise<boolean> {
  if (actorId === postAuthorId) return false; // Don't notify self

  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get actor name
    const { data: actor } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', actorId)
      .single();

    // Get post title for context
    const { data: post } = await supabase
      .from('posts')
      .select('title, short_id')
      .eq('id', postId)
      .single();

    const actorName = actor?.display_name || 'Someone';
    const postTitle = post?.title || `Post #${post?.short_id}`;

    const title = type === 'post_like' ? 'New like on your post' : 'New comment on your post';
    const message = type === 'post_like' 
      ? `${actorName} liked your post "${postTitle}"`
      : `${actorName} commented on your post "${postTitle}"`;

    return createNotification({
      userId: postAuthorId,
      type,
      title,
      message,
      actionUrl: `/feed/${postId}`,
      actorId,
      entityType: 'post',
      entityId: postId
    });
  } catch (error) {
    console.error('Error in notifyPostEngagement:', error);
    return false;
  }
}

export async function notifyCommentReply(
  commentId: string, 
  commentAuthorId: string, 
  actorId: string
): Promise<boolean> {
  if (actorId === commentAuthorId) return false; // Don't notify self

  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get actor name
    const { data: actor } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', actorId)
      .single();

    // Get comment context
    const { data: comment } = await supabase
      .from('post_comments')
      .select('post_id, content')
      .eq('id', commentId)
      .single();

    const actorName = actor?.display_name || 'Someone';
    const commentPreview = comment?.content?.substring(0, 50) + '...' || 'your comment';

    return createNotification({
      userId: commentAuthorId,
      type: 'comment_reply',
      title: 'New reply to your comment',
      message: `${actorName} replied to your comment "${commentPreview}"`,
      actionUrl: `/feed/${comment?.post_id}`,
      actorId,
      entityType: 'comment',
      entityId: commentId
    });
  } catch (error) {
    console.error('Error in notifyCommentReply:', error);
    return false;
  }
}

/**
 * Team Notifications
 */

export async function notifyTeamInvitation(
  teamId: string, 
  teamName: string, 
  inviteeId: string, 
  inviterId: string
): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get inviter name
    const { data: inviter } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', inviterId)
      .single();

    const inviterName = inviter?.display_name || 'Someone';

    return createNotification({
      userId: inviteeId,
      type: 'team_invitation',
      title: 'Team invitation',
      message: `${inviterName} invited you to join "${teamName}"`,
      actionUrl: `/teams/${teamId}`,
      actorId: inviterId,
      entityType: 'team',
      entityId: teamId
    });
  } catch (error) {
    console.error('Error in notifyTeamInvitation:', error);
    return false;
  }
}

export async function notifyTeamMemberJoined(
  teamId: string, 
  teamName: string, 
  memberIds: string[], 
  newMemberId: string
): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get new member name
    const { data: newMember } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', newMemberId)
      .single();

    const newMemberName = newMember?.display_name || 'Someone';

    // Create notifications for all existing members
    const notifications = memberIds.map(memberId => ({
      userId: memberId,
      type: 'team_member_joined' as NotificationType,
      title: 'New team member',
      message: `${newMemberName} joined "${teamName}"`,
      actionUrl: `/teams/${teamId}`,
      actorId: newMemberId,
      entityType: 'team' as EntityType,
      entityId: teamId
    }));

    const createdCount = await createBulkNotifications(notifications);
    return createdCount > 0;
  } catch (error) {
    console.error('Error in notifyTeamMemberJoined:', error);
    return false;
  }
}

/**
 * Gamification Notifications
 */

export async function notifyLevelUp(
  userId: string, 
  oldLevel: number, 
  newLevel: number
): Promise<boolean> {
  return createNotification({
    userId,
    type: 'level_up',
    title: 'Level Up! 🎉',
    message: `Congratulations! You've reached level ${newLevel}!`,
    data: { oldLevel, newLevel }
  });
}

export async function notifyRankUp(
  userId: string, 
  oldRank: string, 
  newRank: string
): Promise<boolean> {
  return createNotification({
    userId,
    type: 'rank_up',
    title: 'Rank Up! ⭐',
    message: `Amazing! You've been promoted to ${newRank}!`,
    data: { oldRank, newRank }
  });
}

export async function notifyBadgeUnlock(
  userId: string, 
  badgeName: string, 
  badgeDescription: string
): Promise<boolean> {
  return createNotification({
    userId,
    type: 'badge_unlocked',
    title: 'Badge Unlocked! 🏆',
    message: `You've earned the "${badgeName}" badge! ${badgeDescription}`,
    data: { badgeName, badgeDescription }
  });
}

/**
 * Event Notifications
 */

export async function notifyEventReminder(
  eventId: string, 
  attendeeIds: string[], 
  hoursUntil: 24 | 6
): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('title, event_date, start_time, location')
      .eq('id', eventId)
      .single();

    if (!event) return false;

    const eventName = event.title;
    const eventTime = `${event.event_date} at ${event.start_time}`;
    const location = event.location;

    const notifications = attendeeIds.map(attendeeId => ({
      userId: attendeeId,
      type: hoursUntil === 24 ? 'event_reminder_24h' : 'event_reminder_6h' as NotificationType,
      title: `Event Reminder (${hoursUntil}h)`,
      message: `"${eventName}" starts in ${hoursUntil} hours at ${eventTime}${location ? ` - ${location}` : ''}`,
      actionUrl: `/events/${eventId}`,
      entityType: 'event' as EntityType,
      entityId: eventId,
      emailRequired: true
    }));

    const createdCount = await createBulkNotifications(notifications);
    return createdCount > 0;
  } catch (error) {
    console.error('Error in notifyEventReminder:', error);
    return false;
  }
}

export async function notifyEventUpdate(
  eventId: string, 
  attendeeIds: string[], 
  updateType: 'cancelled' | 'updated'
): Promise<boolean> {
  const supabase = createSupabaseServer();
  if (!supabase) return false;

  try {
    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (!event) return false;

    const eventName = event.title;
    const title = updateType === 'cancelled' ? 'Event Cancelled' : 'Event Updated';
    const message = updateType === 'cancelled' 
      ? `"${eventName}" has been cancelled`
      : `"${eventName}" has been updated`;

    const notifications = attendeeIds.map(attendeeId => ({
      userId: attendeeId,
      type: updateType === 'cancelled' ? 'event_cancelled' : 'event_booking_confirmed' as NotificationType,
      title,
      message,
      actionUrl: `/events/${eventId}`,
      entityType: 'event' as EntityType,
      entityId: eventId
    }));

    const createdCount = await createBulkNotifications(notifications);
    return createdCount > 0;
  } catch (error) {
    console.error('Error in notifyEventUpdate:', error);
    return false;
  }
}
