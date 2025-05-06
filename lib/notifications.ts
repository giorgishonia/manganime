import { supabase } from './supabase';

// Define the structure for the notification data payload
interface NotificationData {
  sender_user_id?: string;
  sender_username?: string | null;
  comment_id?: string;
  content_id?: string;
  content_type?: 'anime' | 'manga';
  comment_snippet?: string;
  content_title?: string;
  episode_number?: number | string;
  chapter_number?: number | string;
  // Add other relevant data fields as needed
}

/**
 * Creates a notification message based on type and data.
 * @param type Notification type (e.g., 'comment_like', 'new_episode')
 * @param data Contextual data for the notification
 * @returns The constructed notification message string
 */
function constructNotificationMessage(type: string, data: NotificationData): string {
  const sender = data.sender_username || 'Someone';

  switch (type) {
    case 'comment_like':
      return `${sender} liked your comment${data.comment_snippet ? ': "' + data.comment_snippet + '"' : '.'}`;
    case 'comment_reply':
      return `${sender} replied to your comment${data.comment_snippet ? ': "' + data.comment_snippet + '"' : '.'}`;
    case 'new_episode':
      return `Episode ${data.episode_number || 'New'} of ${data.content_title || 'a show'} you subscribed to is out!`;
    case 'new_chapter':
      return `Chapter ${data.chapter_number || 'New'} of ${data.content_title || 'a manga'} you subscribed to is out!`;
    case 'new_content':
      return `${data.content_title || 'New content'} was added to the site.`;
    // Add more cases for different notification types
    default:
      console.warn(`Unknown notification type: ${type}`);
      return `You have a new notification.`;
  }
}

/**
 * Creates and inserts a notification into the database.
 * @param recipientUserId The user ID of the notification recipient.
 * @param type The type of notification (e.g., 'comment_like').
 * @param data An object containing contextual data for the notification.
 * @returns Object indicating success or failure.
 */
export async function createNotification(
  recipientUserId: string,
  type: string,
  data: NotificationData
): Promise<{ success: boolean; error?: any }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }
  if (!recipientUserId) {
    return { success: false, error: 'Recipient User ID is required' };
  }

  try {
    const message = constructNotificationMessage(type, data);

    const notificationPayload = {
      user_id: recipientUserId, // Ensure this matches the recipient's ID
      type: type,
      sender_user_id: data.sender_user_id || null,
      content_id: data.content_id || null,
      comment_id: data.comment_id || null,
      message: message,
      is_read: false, // Notifications start as unread
    };

    console.log("Inserting notification:", notificationPayload);

    // Use the public client - relies on RLS policy allowing authenticated inserts
    // CONSIDER using supabaseAdmin or an Edge Function for security.
    const { error } = await supabase
      .from('notifications')
      .insert(notificationPayload);

    if (error) {
      console.error('Error inserting notification:', error);
      // Don't throw, just return failure
      return { success: false, error };
    }

    console.log(`Notification (${type}) created successfully for user ${recipientUserId}`);
    return { success: true };

  } catch (error) {
    console.error('Error in createNotification function:', error);
    return { success: false, error };
  }
}

// Add other notification functions here later (get, mark read, count)

// Define a type for the notification object, including optional sender profile
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  sender_user_id?: string;
  content_id?: string;
  comment_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: {
    username: string;
    avatar_url: string;
  } | null; // Add sender profile
}

// Cache notifications for a short period to avoid excessive requests
const notificationCache: {
  [userId: string]: {
    timestamp: number;
    notifications: Notification[];
  };
} = {};

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30 * 1000; 

/**
 * Fetches notifications for a specific user with optimized performance.
 * @param userId The ID of the user whose notifications to fetch.
 * @param limit The maximum number of notifications to fetch.
 * @param useCache Whether to use cached notifications if available.
 * @returns Object containing success status, notifications array, or error.
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 10, // Reduced default limit for better performance
  useCache: boolean = true
): Promise<{ success: boolean; notifications?: Notification[]; error?: any }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  // Check if we have cached notifications that are still valid
  const cachedData = notificationCache[userId];
  if (useCache && cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
    console.log('Using cached notifications');
    return { success: true, notifications: cachedData.notifications };
  }

  // Create a timeout promise
  const timeoutPromise = new Promise<{ success: boolean; error: string }>((_, reject) => {
    setTimeout(() => {
      reject({ success: false, error: 'Notification fetch timed out' });
    }, 8000); // 8 second timeout
  });

  try {
    // Race between the actual fetch and the timeout
    const result = await Promise.race([
      fetchNotificationsWithProfiles(userId, limit),
      timeoutPromise
    ]);

    // If successful and using cache, update the cache
    if (result.success && result.notifications) {
      notificationCache[userId] = {
        timestamp: Date.now(),
        notifications: result.notifications
      };
    }

    return result;
  } catch (error) {
    console.error('Error or timeout in getUserNotifications:', error);
    
    // If we timed out but have cached data, return that with a flag
    if (cachedData) {
      return { 
        success: true, 
        notifications: cachedData.notifications,
        error: 'Returned cached data due to timeout'
      };
    }
    
    return { success: false, error };
  }
}

/**
 * Core function to fetch notifications with profiles in a single efficient query
 */
async function fetchNotificationsWithProfiles(
  userId: string,
  limit: number
): Promise<{ success: boolean; notifications?: Notification[]; error?: any }> {
  try {
    console.log(`Fetching notifications for user ${userId}, limit: ${limit}`);
    
    // First, get notifications
    const { data: notificationsData, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error };
    }

    if (!notificationsData || notificationsData.length === 0) {
      return { success: true, notifications: [] };
    }

    console.log(`Retrieved ${notificationsData.length} notifications`);

    // Get unique sender IDs from notifications that have one
    const senderIds = [
      ...new Set(
        notificationsData
          .map(n => n.sender_user_id)
          .filter(id => id !== null && id !== undefined) as string[]
      )
    ];

    let senderProfilesMap: Map<string, { username: string; avatar_url: string }> = new Map();

    // Fetch sender profiles if there are any sender IDs
    if (senderIds.length > 0) {
      try {
        console.log(`Fetching profiles for ${senderIds.length} senders`);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', senderIds);

        if (profileError) {
          console.warn('Error fetching sender profiles for notifications:', profileError);
          // Continue without profile info if fetching fails
        } else if (profiles) {
          console.log(`Retrieved ${profiles.length} profiles`);
          profiles.forEach(p => {
            senderProfilesMap.set(p.id, { username: p.username || 'User', avatar_url: p.avatar_url || '' });
          });
        }
      } catch (profileFetchError) {
        console.error('Error fetching profiles:', profileFetchError);
        // Continue without profile info
      }
    }

    // Combine notifications with sender profiles
    const processedNotifications = notificationsData.map(notif => ({
      id: notif.id,
      user_id: notif.user_id,
      type: notif.type,
      sender_user_id: notif.sender_user_id,
      content_id: notif.content_id,
      comment_id: notif.comment_id,
      message: notif.message,
      is_read: notif.is_read,
      created_at: notif.created_at,
      sender_profile: notif.sender_user_id ? senderProfilesMap.get(notif.sender_user_id) || null : null,
    }));

    return { success: true, notifications: processedNotifications };
  } catch (error) {
    console.error('Error in fetchNotificationsWithProfiles:', error);
    return { success: false, error };
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<{ success: boolean; count?: number; error?: any }> {
  if (!supabase || !userId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { success: false, error };
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  userId: string, 
  notificationIds: string[]
): Promise<{ success: boolean; error?: any }> {
  if (!supabase || !userId || !notificationIds.length) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', notificationIds);

    if (error) {
      throw error;
    }

    // Update the cache if we have it
    if (notificationCache[userId]) {
      notificationCache[userId].notifications = notificationCache[userId].notifications.map(n => {
        if (notificationIds.includes(n.id)) {
          return { ...n, is_read: true };
        }
        return n;
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return { success: false, error };
  }
} 