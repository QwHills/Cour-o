// Messaging service — Supabase-backed
// Tables: conversations (user_id + teacher_id + optional class_id) + messages (conversation_id)
import { supabase } from './supabase/client';

export type SenderRole = 'user' | 'teacher' | 'system';

export interface Conversation {
  id: string;
  userId: string;
  teacherId: string;
  classId?: string;
  lastMessageAt: string;
  unreadUser: boolean;
  unreadTeacher: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderRole: SenderRole;
  body: string;
  moderated: boolean;
  createdAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Caches
const conversationCache = new Map<string, Conversation>();
const messagesByConversation = new Map<string, Message[]>();

function rowToConversation(row: any): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    teacherId: row.teacher_id,
    classId: row.class_id ?? undefined,
    lastMessageAt: row.last_message_at,
    unreadUser: !!row.unread_user,
    unreadTeacher: !!row.unread_teacher,
  };
}

function rowToMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderRole: row.sender_role as SenderRole,
    body: row.body,
    moderated: !!row.moderated,
    createdAt: row.created_at,
  };
}

export const messagingService = {
  // Hydrate conversations for a user or teacher (RLS filters visible rows)
  async loadConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (error) {
      console.warn('load conversations:', error.message);
      return [];
    }
    conversationCache.clear();
    const list = (data ?? []).map(rowToConversation);
    list.forEach((c) => conversationCache.set(c.id, c));
    notify();
    return list;
  },

  listConversations(): Conversation[] {
    return Array.from(conversationCache.values()).sort((a, b) =>
      b.lastMessageAt.localeCompare(a.lastMessageAt)
    );
  },

  listForUser(userId: string): Conversation[] {
    return this.listConversations().filter((c) => c.userId === userId);
  },

  listForTeacher(teacherId: string): Conversation[] {
    return this.listConversations().filter((c) => c.teacherId === teacherId);
  },

  getConversation(id: string): Conversation | undefined {
    return conversationCache.get(id);
  },

  // Create or return existing conversation for (user, teacher, class) triple
  async getOrCreateConversation(
    userId: string,
    teacherId: string,
    classId?: string
  ): Promise<Conversation> {
    // Try to find existing
    const existing = Array.from(conversationCache.values()).find(
      (c) =>
        c.userId === userId &&
        c.teacherId === teacherId &&
        (c.classId ?? null) === (classId ?? null)
    );
    if (existing) return existing;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        teacher_id: teacherId,
        class_id: classId ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      // Could be a unique-constraint race — try to fetch
      const { data: fetched } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('teacher_id', teacherId)
        .eq('class_id', classId ?? null)
        .maybeSingle();
      if (fetched) {
        const c = rowToConversation(fetched);
        conversationCache.set(c.id, c);
        notify();
        return c;
      }
      throw new Error(error?.message ?? 'Conversation creation failed');
    }
    const c = rowToConversation(data);
    conversationCache.set(c.id, c);
    notify();
    return c;
  },

  // Messages
  async loadMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('load messages:', error.message);
      return [];
    }
    const list = (data ?? []).map(rowToMessage);
    messagesByConversation.set(conversationId, list);
    notify();
    return list;
  },

  listMessages(conversationId: string): Message[] {
    return messagesByConversation.get(conversationId) ?? [];
  },

  async sendMessage(
    conversationId: string,
    senderRole: SenderRole,
    body: string
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_role: senderRole,
        body,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Envoi du message échoué');

    const msg = rowToMessage(data);
    const existing = messagesByConversation.get(conversationId) ?? [];
    messagesByConversation.set(conversationId, [...existing, msg]);

    // Bump conversation unread flag + last_message_at
    const otherUnread =
      senderRole === 'user' ? { unread_teacher: true } : { unread_user: true };
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        ...otherUnread,
      })
      .eq('id', conversationId);

    // Refresh conversation row in cache
    const { data: convRow } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    if (convRow) conversationCache.set(conversationId, rowToConversation(convRow));

    notify();
    return msg;
  },

  async markRead(conversationId: string, asRole: 'user' | 'teacher'): Promise<void> {
    const field = asRole === 'user' ? 'unread_user' : 'unread_teacher';
    const c = conversationCache.get(conversationId);
    if (c) {
      conversationCache.set(conversationId, {
        ...c,
        unreadUser: asRole === 'user' ? false : c.unreadUser,
        unreadTeacher: asRole === 'teacher' ? false : c.unreadTeacher,
      });
      notify();
    }
    await supabase.from('conversations').update({ [field]: false }).eq('id', conversationId);
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
