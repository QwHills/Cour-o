// Messaging service — Supabase-backed sur la table canonique `direct_messages`
// (la même que le site koureo.fr). Une « conversation » n'est plus une ligne
// persistée : c'est la paire (teacher_id, student_id) dérivée des messages.
//
// Schéma direct_messages :
//   teacher_id  → teacher_profiles.id (PAS users.id)
//   student_id  → users.id (= auth.uid() de l'élève)
//   sender_role → 'teacher' | 'student'
//   read_at     → null tant que le destinataire n'a pas lu
//
// Côté API publique on garde les rôles historiques de l'app ('user'/'teacher')
// et on traduit 'user' ↔ 'student' au niveau des requêtes.
import { supabase } from './supabase/client';

export type SenderRole = 'user' | 'teacher';

type DbSenderRole = 'teacher' | 'student';

export interface Conversation {
  /** Id synthétique `${teacherId}:${studentId}` — pas de ligne en DB. */
  id: string;
  /** users.id de l'élève. */
  userId: string;
  /** teacher_profiles.id du prof. */
  teacherId: string;
  lastMessageAt: string;
  /** Messages du prof non lus par l'élève. */
  unreadUser: boolean;
  /** Messages de l'élève non lus par le prof. */
  unreadTeacher: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderRole: SenderRole;
  body: string;
  createdAt: string;
  readAt: string | null;
}

interface DirectMessageRow {
  id: string;
  teacher_id: string;
  student_id: string;
  sender_role: DbSenderRole;
  body: string;
  created_at: string;
  read_at: string | null;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Caches
const conversationCache = new Map<string, Conversation>();
const messagesByConversation = new Map<string, Message[]>();

function pairId(teacherId: string, userId: string): string {
  return `${teacherId}:${userId}`;
}

function parsePairId(conversationId: string): { teacherId: string; userId: string } {
  const sep = conversationId.indexOf(':');
  return {
    teacherId: conversationId.slice(0, sep),
    userId: conversationId.slice(sep + 1),
  };
}

function toAppRole(role: DbSenderRole): SenderRole {
  return role === 'student' ? 'user' : 'teacher';
}

function toDbRole(role: SenderRole): DbSenderRole {
  return role === 'user' ? 'student' : 'teacher';
}

function rowToMessage(row: DirectMessageRow): Message {
  return {
    id: row.id,
    conversationId: pairId(row.teacher_id, row.student_id),
    senderRole: toAppRole(row.sender_role),
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/** Recalcule la fiche conversation d'une paire à partir de ses messages. */
function rebuildConversation(conversationId: string): Conversation {
  const { teacherId, userId } = parsePairId(conversationId);
  const messages = messagesByConversation.get(conversationId) ?? [];
  const last = messages[messages.length - 1];
  const existing = conversationCache.get(conversationId);
  return {
    id: conversationId,
    userId,
    teacherId,
    lastMessageAt:
      last?.createdAt ?? existing?.lastMessageAt ?? new Date().toISOString(),
    unreadUser: messages.some((m) => m.senderRole === 'teacher' && !m.readAt),
    unreadTeacher: messages.some((m) => m.senderRole === 'user' && !m.readAt),
  };
}

export const messagingService = {
  // Hydrate toutes les conversations visibles (RLS filtre côté serveur :
  // l'élève voit ses fils, le prof ceux de son teacher_profile).
  async loadConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('id, teacher_id, student_id, sender_role, body, created_at, read_at')
      .order('created_at', { ascending: true })
      .limit(2000);
    if (error) {
      console.warn('load conversations:', error.message);
      return [];
    }

    conversationCache.clear();
    messagesByConversation.clear();
    for (const row of (data ?? []) as DirectMessageRow[]) {
      const msg = rowToMessage(row);
      const list = messagesByConversation.get(msg.conversationId);
      if (list) list.push(msg);
      else messagesByConversation.set(msg.conversationId, [msg]);
    }
    for (const id of messagesByConversation.keys()) {
      conversationCache.set(id, rebuildConversation(id));
    }
    notify();
    return this.listConversations();
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

  // Prépare (localement) la conversation d'une paire (élève, prof). Aucune
  // écriture en DB : le fil n'existera côté serveur qu'au premier message.
  async getOrCreateConversation(
    userId: string,
    teacherId: string
  ): Promise<Conversation> {
    const id = pairId(teacherId, userId);
    const existing = conversationCache.get(id);
    if (existing) return existing;

    const conv: Conversation = {
      id,
      userId,
      teacherId,
      lastMessageAt: new Date().toISOString(),
      unreadUser: false,
      unreadTeacher: false,
    };
    conversationCache.set(id, conv);
    notify();
    return conv;
  },

  // Messages
  async loadMessages(conversationId: string): Promise<Message[]> {
    const { teacherId, userId } = parsePairId(conversationId);
    const { data, error } = await supabase
      .from('direct_messages')
      .select('id, teacher_id, student_id, sender_role, body, created_at, read_at')
      .eq('teacher_id', teacherId)
      .eq('student_id', userId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('load messages:', error.message);
      return [];
    }
    const list = ((data ?? []) as DirectMessageRow[]).map(rowToMessage);
    messagesByConversation.set(conversationId, list);
    if (list.length > 0 || conversationCache.has(conversationId)) {
      conversationCache.set(conversationId, rebuildConversation(conversationId));
    }
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
    const { teacherId, userId } = parsePairId(conversationId);
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        teacher_id: teacherId,
        student_id: userId,
        sender_role: toDbRole(senderRole),
        body,
      })
      .select('id, teacher_id, student_id, sender_role, body, created_at, read_at')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Envoi du message échoué');

    const msg = rowToMessage(data as DirectMessageRow);
    const existing = messagesByConversation.get(conversationId) ?? [];
    messagesByConversation.set(conversationId, [...existing, msg]);
    conversationCache.set(conversationId, rebuildConversation(conversationId));
    notify();
    return msg;
  },

  // Marque comme lus les messages entrants (= envoyés par l'AUTRE rôle).
  async markRead(conversationId: string, asRole: SenderRole): Promise<void> {
    const { teacherId, userId } = parsePairId(conversationId);
    const incomingDbRole: DbSenderRole = asRole === 'user' ? 'teacher' : 'student';
    const incomingAppRole: SenderRole = asRole === 'user' ? 'teacher' : 'user';
    const now = new Date().toISOString();

    // Mise à jour optimiste du cache local.
    const messages = messagesByConversation.get(conversationId);
    if (messages) {
      messagesByConversation.set(
        conversationId,
        messages.map((m) =>
          m.senderRole === incomingAppRole && !m.readAt ? { ...m, readAt: now } : m
        )
      );
    }
    if (conversationCache.has(conversationId)) {
      conversationCache.set(conversationId, rebuildConversation(conversationId));
    }
    notify();

    await supabase
      .from('direct_messages')
      .update({ read_at: now })
      .eq('teacher_id', teacherId)
      .eq('student_id', userId)
      .eq('sender_role', incomingDbRole)
      .is('read_at', null);
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
