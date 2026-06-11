// Admin messages service — Supabase-backed
// Canal "Koureo équipe" ⇄ utilisateur (table admin_messages, bidirectionnel).
// RLS : l'utilisateur lit/écrit (sender='user') son propre fil et peut marquer
// les messages de l'équipe comme lus. Miroir mobile de
// koureo-vitrine/src/lib/messaging/adminMessages.ts + actions replyToKoureo.
import { supabase } from './supabase/client';

export type AdminMessageSender = 'admin' | 'user';

export interface AdminMessage {
  id: string;
  userId: string;
  sender: AdminMessageSender;
  body: string;
  createdAt: string;
  readAt?: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Un seul fil par utilisateur connecté (RLS) — cache simple, trié par date asc.
let messagesCache: AdminMessage[] = [];

function rowToMessage(row: any): AdminMessage {
  return {
    id: row.id,
    userId: row.user_id,
    sender: row.sender as AdminMessageSender,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
  };
}

export const adminMessagesService = {
  // Hydrate le fil de l'utilisateur. Résilient : en cas d'erreur (table
  // absente, hors-ligne…) on garde le cache courant et l'UI reste utilisable.
  async load(userId: string): Promise<AdminMessage[]> {
    const { data, error } = await supabase
      .from('admin_messages')
      .select('id, user_id, sender, body, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) {
      console.warn('load admin_messages:', error.message);
      return messagesCache;
    }
    messagesCache = (data ?? []).map(rowToMessage);
    notify();
    return messagesCache;
  },

  list(): AdminMessage[] {
    return messagesCache;
  },

  lastMessage(): AdminMessage | undefined {
    return messagesCache[messagesCache.length - 1];
  },

  // Messages de l'équipe pas encore lus par l'utilisateur.
  countUnread(): number {
    return messagesCache.filter((m) => m.sender === 'admin' && !m.readAt).length;
  },

  // L'utilisateur répond à l'équipe Koureo (sender='user', autorisé par RLS).
  async send(userId: string, body: string): Promise<AdminMessage> {
    const text = body.trim();
    if (!text) throw new Error('Message vide.');
    if (text.length > 4000) throw new Error('Message trop long (4000 caractères max).');

    const { data, error } = await supabase
      .from('admin_messages')
      .insert({ user_id: userId, sender: 'user', body: text })
      .select('id, user_id, sender, body, created_at, read_at')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "L'envoi du message a échoué.");
    }
    const msg = rowToMessage(data);
    messagesCache = [...messagesCache, msg];
    notify();
    return msg;
  },

  // Marque comme lus tous les messages de l'équipe (read_at = maintenant).
  async markRead(userId: string): Promise<void> {
    if (this.countUnread() === 0) return;
    const now = new Date().toISOString();
    // Optimiste : le badge disparaît tout de suite, la DB suit best-effort.
    messagesCache = messagesCache.map((m) =>
      m.sender === 'admin' && !m.readAt ? { ...m, readAt: now } : m,
    );
    notify();
    const { error } = await supabase
      .from('admin_messages')
      .update({ read_at: now })
      .eq('user_id', userId)
      .eq('sender', 'admin')
      .is('read_at', null);
    if (error) console.warn('markRead admin_messages:', error.message);
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
