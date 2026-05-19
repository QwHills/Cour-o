// Notifications service — Supabase-backed
// Table: notifications (user_id, type, title, body, action_screen, action_params, read)
import { supabase } from './supabase/client';
import { AppNotification, NotificationType, NotificationPreferences } from '../types/domain';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Cache: notificationId → AppNotification
const cache = new Map<string, AppNotification>();

function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: !!row.read,
    action: row.action_screen
      ? { screen: row.action_screen, params: row.action_params ?? undefined }
      : undefined,
  };
}

// Preferences are stored client-side for now (could move to users table later)
const defaultPreferences: NotificationPreferences = {
  bookingReminders: true,
  messages: true,
  newCourses: true,
  favoriteTeacherUpdates: true,
  promotional: false,
};
let preferences: NotificationPreferences = { ...defaultPreferences };

export const notificationsService = {
  async load(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('load notifications:', error.message);
      return [];
    }
    cache.clear();
    const list = (data ?? []).map(rowToNotification);
    list.forEach((n) => cache.set(n.id, n));
    notify();
    return list;
  },

  listForUser(userId: string): AppNotification[] {
    return Array.from(cache.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  countUnread(userId: string): number {
    return Array.from(cache.values()).filter((n) => n.userId === userId && !n.read).length;
  },

  async markAsRead(id: string): Promise<void> {
    // Optimistic
    const n = cache.get(id);
    if (n) {
      cache.set(id, { ...n, read: true });
      notify();
    }
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) {
      console.warn('mark notif read:', error.message);
      // Rollback
      if (n) {
        cache.set(id, n);
        notify();
      }
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    // Optimistic
    const unread: AppNotification[] = [];
    cache.forEach((n, id) => {
      if (n.userId === userId && !n.read) {
        unread.push(n);
        cache.set(id, { ...n, read: true });
      }
    });
    notify();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) {
      console.warn('mark all notifs read:', error.message);
      // Rollback
      unread.forEach((n) => cache.set(n.id, n));
      notify();
    }
  },

  async send(
    input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        action_screen: input.action?.screen ?? null,
        action_params: input.action?.params ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      console.warn('send notif:', error?.message);
      return null;
    }
    const n = rowToNotification(data);
    cache.set(n.id, n);
    notify();
    return n;
  },

  async delete(id: string): Promise<void> {
    const n = cache.get(id);
    if (n) {
      cache.delete(id);
      notify();
    }
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      console.warn('delete notif:', error.message);
      if (n) {
        cache.set(id, n);
        notify();
      }
    }
  },

  getPreferences(): NotificationPreferences {
    return preferences;
  },

  updatePreferences(patch: Partial<NotificationPreferences>) {
    preferences = { ...preferences, ...patch };
    notify();
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'booking_confirmed':      return '✓';
    case 'booking_reminder':       return '◆';
    case 'course_starting_soon':   return '▲';
    case 'course_cancelled':       return '✕';
    case 'questionnaire_pending':  return '★';
    case 'new_message':            return '○';
    case 'certification_progress': return '✦';
    case 'payment_received':       return '€';
    case 'new_review':             return '♪';
    case 'payout_completed':       return '€';
    case 'offer_suggestion':       return '💡';
  }
}

export function getNotificationColor(type: NotificationType, colors: any): string {
  switch (type) {
    case 'booking_confirmed':
    case 'payment_received':
    case 'payout_completed':
      return colors.success;
    case 'booking_reminder':
    case 'course_starting_soon':
      return colors.primary;
    case 'questionnaire_pending':
    case 'new_review':
      return colors.accent;
    case 'course_cancelled':
      return colors.error;
    case 'new_message':
      return colors.proAccent;
    case 'certification_progress':
      return colors.proAccent;
    case 'offer_suggestion':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

export function formatNotificationTime(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}
