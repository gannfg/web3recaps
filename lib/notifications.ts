// Re-export from unified notification service for backward compatibility
export {
  createNotification,
  notifyLevelUp as createLevelUpNotification,
  notifyRankUp as createRankUpNotification,
  notifyBadgeUnlock as createBadgeUnlockNotification,
  getUserNotifications,
  markAsRead as markNotificationAsRead,
  markAllAsRead as markAllNotificationsAsRead,
  getUnreadCount as getUnreadNotificationCount,
  deleteNotification as deleteOldNotifications
} from './notification-service';

// Legacy interface for backward compatibility
export interface Notification {
  id: string;
  user_id: string;
  type: 'level_up' | 'rank_up' | 'badge_unlocked';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

