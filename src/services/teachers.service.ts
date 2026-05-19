// Teachers service — Supabase-backed
import { supabase } from './supabase/client';
import {
  CertificationProgress,
  TeacherProfile,
  TeacherStatus,
  TeacherKind,
  Category,
} from '../types/domain';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Local cache for sync reads
const cache = new Map<string, TeacherProfile>();
const userIdCache = new Map<string, string>();

function rowToTeacher(row: any): TeacherProfile {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as TeacherKind,
    status: row.status as TeacherStatus,
    displayName: row.display_name,
    bio: row.bio ?? '',
    photoUrl: row.photo_url ?? '',
    categories: (row.categories ?? []) as Category[],
    address: row.address ?? '',
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    freeClassesCompleted: row.free_classes_completed ?? 0,
    avgValidationScore: Number(row.avg_validation_score ?? 0),
    validationResponseCount: row.validation_response_count ?? 0,
    certifiedAt: row.certified_at ?? undefined,
    stripeAccountId: row.stripe_account_id ?? undefined,
    billingConfig: row.vat_regime
      ? {
          vatRegime: row.vat_regime,
          vatNumber: row.vat_number ?? undefined,
          legalName: row.legal_name ?? row.display_name,
          siret: row.siret ?? undefined,
          address: row.address ?? '',
        }
      : undefined,
    photos: {
      place: row.photo_place ?? undefined,
      self: row.photo_self ?? undefined,
      activity: row.photo_activity ?? undefined,
    },
  };
}

export const teachersService = {
  async list(): Promise<TeacherProfile[]> {
    const { data, error } = await supabase.from('teacher_profiles').select('*');
    if (error) {
      console.warn('list teachers:', error.message);
      return [];
    }
    const list = (data ?? []).map(rowToTeacher);
    list.forEach((t) => {
      cache.set(t.id, t);
      userIdCache.set(t.userId, t.id);
    });
    return list;
  },

  async get(id: string): Promise<TeacherProfile | undefined> {
    if (cache.has(id)) return cache.get(id);
    const { data, error } = await supabase
      .from('teacher_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return undefined;
    const t = rowToTeacher(data);
    cache.set(id, t);
    return t;
  },

  // Sync cache reader — returns undefined if the teacher hasn't been hydrated
  // yet. Use `get(id)` first if you need to guarantee a fresh load.
  getById(id: string): TeacherProfile | undefined {
    return cache.get(id);
  },

  getCached(id: string): TeacherProfile | undefined {
    return cache.get(id);
  },

  // Force re-fetch of a single teacher, bypassing cache
  async refresh(id: string): Promise<TeacherProfile | undefined> {
    cache.delete(id);
    return this.get(id);
  },

  async getByUserId(userId: string): Promise<TeacherProfile | undefined> {
    const cachedId = userIdCache.get(userId);
    if (cachedId && cache.has(cachedId)) return cache.get(cachedId);

    const { data, error } = await supabase
      .from('teacher_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return undefined;
    const t = rowToTeacher(data);
    cache.set(t.id, t);
    userIdCache.set(userId, t.id);
    return t;
  },

  async createTeacher(input: {
    userId: string;
    kind: TeacherKind;
    displayName: string;
    bio: string;
    photoUrl: string;
    categories: Category[];
    address: string;
  }): Promise<TeacherProfile> {
    const { data, error } = await supabase
      .from('teacher_profiles')
      .insert({
        user_id: input.userId,
        kind: input.kind,
        status: input.kind === 'professional' ? 'professional' : 'new_teacher',
        display_name: input.displayName,
        bio: input.bio,
        photo_url: input.photoUrl,
        categories: input.categories,
        address: input.address,
        latitude: 48.1113,
        longitude: -1.68,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const t = rowToTeacher(data);
    cache.set(t.id, t);
    userIdCache.set(t.userId, t.id);
    notify();
    return t;
  },

  async updateProfile(teacherId: string, patch: Partial<TeacherProfile>): Promise<void> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (patch.displayName !== undefined) updates.display_name = patch.displayName;
    if (patch.bio !== undefined) updates.bio = patch.bio;
    if (patch.categories !== undefined) updates.categories = patch.categories;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.latitude !== undefined) updates.latitude = patch.latitude;
    if (patch.longitude !== undefined) updates.longitude = patch.longitude;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.certifiedAt !== undefined) updates.certified_at = patch.certifiedAt;
    if (patch.freeClassesCompleted !== undefined)
      updates.free_classes_completed = patch.freeClassesCompleted;
    if (patch.billingConfig) {
      updates.vat_regime = patch.billingConfig.vatRegime;
      updates.vat_number = patch.billingConfig.vatNumber;
      updates.legal_name = patch.billingConfig.legalName;
      updates.siret = patch.billingConfig.siret;
    }
    if (patch.photos) {
      if (patch.photos.place !== undefined) updates.photo_place = patch.photos.place;
      if (patch.photos.self !== undefined) updates.photo_self = patch.photos.self;
      if (patch.photos.activity !== undefined) updates.photo_activity = patch.photos.activity;
    }

    const { error } = await supabase
      .from('teacher_profiles')
      .update(updates)
      .eq('id', teacherId);
    if (error) {
      console.warn('update teacher:', error.message);
      return;
    }
    cache.delete(teacherId);
    await this.get(teacherId);
    notify();
  },

  async updatePhotos(
    teacherId: string,
    photos: { place?: string; self?: string; activity?: string }
  ): Promise<void> {
    await this.updateProfile(teacherId, {
      photos: { ...cache.get(teacherId)?.photos, ...photos },
    });
  },

  hasCompletePhotos(teacherId: string): boolean {
    const t = cache.get(teacherId);
    if (!t?.photos) return false;
    return !!(t.photos.place && t.photos.self && t.photos.activity);
  },

  canCreatePaidClass(teacherId: string): boolean {
    const t = cache.get(teacherId);
    if (!t) return false;
    return t.status === 'certified_teacher' || t.status === 'professional';
  },

  isInEvaluation(teacherId: string): boolean {
    const t = cache.get(teacherId);
    if (!t) return false;
    return t.status === 'new_teacher' || t.status === 'under_review';
  },

  getStatus(teacherId: string): TeacherStatus | undefined {
    return cache.get(teacherId)?.status;
  },

  async computeProgress(teacherId: string): Promise<CertificationProgress | null> {
    const t = cache.get(teacherId) ?? (await this.get(teacherId));
    if (!t) return null;

    const { data: qs } = await supabase
      .from('validation_questionnaires')
      .select('q5_rating')
      .eq('teacher_id', teacherId);

    const responses = qs ?? [];
    const avgRating =
      responses.length > 0
        ? responses.reduce((s: number, r: any) => s + r.q5_rating, 0) / responses.length
        : 0;

    const thresholds = { minFreeClasses: 3, minAvgRating: 4, minResponseCount: 3 };
    const blockers: string[] = [];
    if (t.freeClassesCompleted < thresholds.minFreeClasses) {
      const r = thresholds.minFreeClasses - t.freeClassesCompleted;
      blockers.push(`${r} cours gratuit${r > 1 ? 's' : ''} à donner`);
    }
    if (avgRating < thresholds.minAvgRating) {
      blockers.push(`Note moyenne à maintenir ≥ ${thresholds.minAvgRating}/5`);
    }
    if (responses.length < thresholds.minResponseCount) {
      const r = thresholds.minResponseCount - responses.length;
      blockers.push(`${r} retour${r > 1 ? 's' : ''} à collecter`);
    }

    return {
      teacherId,
      status: t.status,
      freeDone: t.freeClassesCompleted,
      avgRating,
      responses: responses.length,
      thresholds,
      eligible: blockers.length === 0,
      blockers,
    };
  },

  async promoteIfEligible(teacherId: string): Promise<boolean> {
    const progress = await this.computeProgress(teacherId);
    if (!progress || !progress.eligible) return false;
    const t = cache.get(teacherId);
    if (!t || t.status === 'certified_teacher' || t.status === 'professional') return false;

    await this.updateProfile(teacherId, {
      status: 'certified_teacher',
      certifiedAt: new Date().toISOString(),
    });
    return true;
  },

  async recordFreeClassCompleted(teacherId: string): Promise<void> {
    const t = cache.get(teacherId) ?? (await this.get(teacherId));
    if (!t) return;
    await this.updateProfile(teacherId, {
      freeClassesCompleted: t.freeClassesCompleted + 1,
      status: t.status === 'new_teacher' ? 'under_review' : t.status,
    });
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
