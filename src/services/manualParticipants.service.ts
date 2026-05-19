// Manual participants — students the teacher adds by hand for a specific
// session (trial sessions, walk-ins, guests). Live alongside the real
// bookings in the session detail UI but never affect billing.

import { supabase } from './supabase/client';
import { ManualParticipant } from '../types/domain';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

const cache = new Map<string, ManualParticipant>();

function rowToParticipant(r: any): ManualParticipant {
  return {
    id: r.id,
    sessionId: r.session_id,
    teacherId: r.teacher_id,
    fullName: r.full_name,
    note: r.note ?? undefined,
    addedBy: r.added_by,
    createdAt: r.created_at,
  };
}

export const manualParticipantsService = {
  async loadForTeacher(teacherId: string): Promise<void> {
    const { data, error } = await supabase
      .from('manual_participants')
      .select('*')
      .eq('teacher_id', teacherId);
    if (error) { console.warn('load manual participants:', error.message); return; }
    cache.clear();
    (data ?? []).forEach((r: any) => cache.set(r.id, rowToParticipant(r)));
    notify();
  },

  listForSession(sessionId: string): ManualParticipant[] {
    return Array.from(cache.values())
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  listForTeacher(teacherId: string): ManualParticipant[] {
    return Array.from(cache.values())
      .filter((p) => p.teacherId === teacherId);
  },

  async add(input: {
    sessionId: string;
    teacherId: string;
    fullName: string;
    note?: string;
    addedBy: string;
  }): Promise<ManualParticipant> {
    const { data, error } = await supabase
      .from('manual_participants')
      .insert({
        session_id: input.sessionId,
        teacher_id: input.teacherId,
        full_name: input.fullName,
        note: input.note ?? null,
        added_by: input.addedBy,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Ajout échoué');
    const p = rowToParticipant(data);
    cache.set(p.id, p);
    notify();
    return p;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('manual_participants').delete().eq('id', id);
    if (error) throw new Error(error.message);
    cache.delete(id);
    notify();
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
