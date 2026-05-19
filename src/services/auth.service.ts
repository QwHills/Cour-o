// Auth service — Supabase Auth
import { supabase } from './supabase/client';
import { Role, User } from '../types/domain';
import { pointsService } from './points.service';
import { readCapturedReferral, clearCapturedReferral } from './points/referralStorage';
// Legacy FileSystem API still exposes readAsStringAsync which is what we need
// to convert a local image URI to base64 → ArrayBuffer for Supabase Storage.
// `fetch(uri).blob()` returns an empty blob on iOS native, so don't use that.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FileSystem = require('expo-file-system/legacy');

type Listener = (user: User | null) => void;
const listeners = new Set<Listener>();

let currentUser: User | null = null;

// Convert Supabase user + profile row to our User type
async function fetchProfile(authUserId: string, email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, role, is_admin, created_at')
    .eq('id', authUserId)
    .single();

  if (error || !data) {
    // Profile not yet created — trigger will handle it on signup, but fallback:
    return {
      id: authUserId,
      email,
      name: email.split('@')[0] ?? 'User',
      role: 'user',
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    avatarUrl: data.avatar_url ?? undefined,
    role: (data.role as Role) ?? 'user',
    isAdmin: data.is_admin === true,
    createdAt: data.created_at,
  };
}

function notify() {
  // Surface the active identity to Sentry so errors group per-user. Lazy
  // import to keep the auth → monitoring direction acyclic with the boot
  // sequence (`initMonitoring` lives in monitoring.ts and could otherwise
  // re-enter auth via crash-time imports).
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('./monitoring');
    if (currentUser) {
      m.identifyUser({ id: currentUser.id, email: currentUser.email, role: currentUser.role });
    } else {
      m.clearUser();
    }
  } catch {
    // monitoring not available — fine, the app shouldn't fail on this.
  }
  listeners.forEach((l) => l(currentUser));
}

// Initialize: check for existing session on app start
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    currentUser = await fetchProfile(data.session.user.id, data.session.user.email ?? '');
    notify();
  }

  // Listen to auth state changes (sign in / out / refresh)
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      currentUser = await fetchProfile(session.user.id, session.user.email ?? '');
    } else {
      currentUser = null;
    }
    notify();
  });
})();

export const authService = {
  getCurrentUser(): User | null {
    return currentUser;
  },

  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Connexion échouée');
    currentUser = await fetchProfile(data.user.id, data.user.email ?? email);
    notify();
    return currentUser!;
  },

  async signUp(name: string, email: string, password: string, role: Role): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Inscription échouée');

    // Small delay to let the trigger create the public.users row
    await new Promise((r) => setTimeout(r, 500));

    currentUser = await fetchProfile(data.user.id, data.user.email ?? email);
    notify();

    // ──────────────────────────────────────────────────────────────
    // Referral capture: if a ?ref=xxx code was saved in storage, attach
    // the origin to the user row (so future bookings attribute the right
    // referral-based points to teacher/friend).
    // ──────────────────────────────────────────────────────────────
    const refCode = readCapturedReferral();
    if (refCode && role === 'user') {
      // Try teacher code first
      const { data: teacher } = await supabase
        .from('teacher_profiles')
        .select('id, user_id')
        .eq('referral_code', refCode)
        .maybeSingle();
      if (teacher) {
        await supabase
          .from('users')
          .update({ invited_by_teacher_id: teacher.id })
          .eq('id', data.user.id);
        // Teacher earns the signup bonus
        if (teacher.user_id) {
          pointsService.award({
            userId: teacher.user_id,
            type: 'teacher_referred_student_signup',
            sourceId: data.user.id,
          });
        }
      } else {
        // Student-to-student referral: we use the inviter's user_id directly
        // as the ref code (URL like `?ref=<uuid>`). Validate it exists in
        // public.users before attributing the link — otherwise typos would
        // silently set an invalid referrer.
        const looksLikeUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(refCode);
        if (looksLikeUuid) {
          const { data: inviter } = await supabase
            .from('users')
            .select('id')
            .eq('id', refCode)
            .neq('id', data.user.id) // can't refer yourself
            .maybeSingle();
          if (inviter) {
            await supabase
              .from('users')
              .update({ invited_by_user_id: inviter.id })
              .eq('id', data.user.id);
            // The +50 points to the inviter are awarded in
            // bookings.service._awardBookingPoints when the friend books
            // their first paid class.
          }
        }
      }
      clearCapturedReferral();
    }

    // Welcome points (fire-and-forget, idempotent — safe to retry)
    if (role === 'user') {
      pointsService.award({
        userId: data.user.id,
        type: 'student_signup',
      });
    }

    return currentUser!;
  },

  async quickSignIn(role: Role): Promise<User> {
    // Dev helper — creates an anonymous demo account
    const email = `demo+${Date.now()}@koureo.fr`;
    const password = 'Demo123456!';
    return this.signUp(role === 'pro' ? 'Nouveau Prof' : 'Explorateur', email, password, role);
  },

  async signOut(): Promise<void> {
    // Optimistic local logout: clear `currentUser` and notify the UI
    // *before* the Supabase round-trip. Without this, a slow network or a
    // stale AsyncStorage write makes the sign-out button feel unresponsive
    // (commonly reported on the iOS simulator).
    currentUser = null;
    notify();

    // Fire-and-forget the actual Supabase sign-out. If it fails, the local
    // state is still cleared so the user lands on the auth screen; the
    // stale Supabase session token will be cleaned up on next launch.
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('supabase signOut:', (e as Error).message);
    }
  },

  switchRole(role: Role): void {
    // Dev-only: updates local role without persisting to Supabase
    // (in prod, you'd persist via supabase.from('users').update({ role }))
    if (currentUser) {
      currentUser = { ...currentUser, role };
      notify();
    }
  },

  // Called at the end of the pro-onboarding flow when an existing user becomes
  // a teacher. Persists the role change server-side so it survives reloads.
  async upgradeToPro(): Promise<void> {
    if (!currentUser) throw new Error('Utilisateur non connecté');
    const { error } = await supabase
      .from('users')
      .update({ role: 'pro', updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);
    if (error) throw new Error(error.message);
    currentUser = { ...currentUser, role: 'pro' };
    notify();
  },

  async updateName(name: string): Promise<void> {
    if (!currentUser) return;
    const { error } = await supabase
      .from('users')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);
    if (error) {
      console.warn('Failed to update name:', error.message);
      return;
    }
    currentUser = { ...currentUser, name };
    notify();
  },

  // Upload an avatar to the `media` Supabase Storage bucket (path:
  // <userId>/avatar-<timestamp>.<ext>) and persist the resulting public URL on
  // the `users.avatar_url` column. Returns the new URL on success.
  //
  // NOTE: on React Native iOS, `fetch(localUri).blob()` returns a blob that's
  // either empty or with the wrong size. We instead read the file as base64
  // through expo-file-system (legacy API) and decode it to a typed array,
  // which is what `supabase-js` actually needs under the hood.
  async uploadAvatar(localUri: string, mimeType = 'image/jpeg'): Promise<string> {
    if (!currentUser) throw new Error('Utilisateur non connecté');
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64 || base64.length === 0) {
      throw new Error('Image vide ou illisible');
    }
    // Decode base64 → Uint8Array (atob is polyfilled by react-native-url-polyfill)
    const binary = global.atob ? global.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const path = `${currentUser.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('media')
      .upload(path, bytes, { contentType: mimeType, upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    // Bust any cached CDN copy by appending the timestamp as a query string.
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error: dbErr } = await supabase
      .from('users')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);
    if (dbErr) throw new Error(`DB update failed: ${dbErr.message}`);
    currentUser = { ...currentUser, avatarUrl: url };
    notify();
    return url;
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
