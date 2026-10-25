import { useLiveQuery } from './useLiveQuery';

/** Unread chat messages across all conversations, kept live. */
export function useUnreadMessages(enabled = true) {
  const { data } = useLiveQuery('/chats/conversations', { events: ['chat:message', 'booking:created', 'booking:updated'], enabled });
  return (data?.conversations || []).reduce((sum, item) => sum + Number(item.unreadCount || 0), 0);
}

/** Notification feed + unread count, kept live. */
export function useNotifications(enabled = true) {
  const query = useLiveQuery('/notifications', { events: ['notification:new', 'booking:updated', 'booking:created'], enabled });
  return { ...query, notifications: query.data?.notifications || [], unread: Number(query.data?.unreadCount || 0) };
}
