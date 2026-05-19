// Favorites service — Supabase-backed
// Table: favorites (user_id, class_id) — composite PK
import { supabase } from './supabase/client';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Local cache for sync reads: userId → Set<classId>
const cache = new Map<string, Set<string>>();

function getOrCreate(userId: string): Set<string> {
  let set = cache.get(userId);
  if (!set) {
    set = new Set();
    cache.set(userId, set);
  }
  return set;
}

export const favoritesService = {
  // Hydrate cache from Supabase (call on user login / screen mount)
  async load(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('class_id')
      .eq('user_id', userId);
    if (error) {
      console.warn('load favorites:', error.message);
      return [];
    }
    const set = new Set<string>((data ?? []).map((r: any) => r.class_id));
    cache.set(userId, set);
    notify();
    return Array.from(set);
  },

  // Sync cached reads (require prior load())
  list(userId: string): string[] {
    const set = cache.get(userId);
    return set ? Array.from(set) : [];
  },

  isFavorite(userId: string, classId: string): boolean {
    return cache.get(userId)?.has(classId) ?? false;
  },

  count(userId: string): number {
    return cache.get(userId)?.size ?? 0;
  },

  // Optimistic toggle + Supabase write
  async toggle(userId: string, classId: string): Promise<boolean> {
    const set = getOrCreate(userId);
    const isCurrentlyFav = set.has(classId);

    if (isCurrentlyFav) {
      // Optimistic remove
      set.delete(classId);
      notify();
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('class_id', classId);
      if (error) {
        // Rollback
        set.add(classId);
        notify();
        console.warn('delete favorite:', error.message);
        throw new Error(error.message);
      }
      return false;
    } else {
      // Optimistic add
      set.add(classId);
      notify();
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, class_id: classId });
      if (error) {
        // Rollback
        set.delete(classId);
        notify();
        console.warn('insert favorite:', error.message);
        throw new Error(error.message);
      }
      return true;
    }
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
