// ============================================================================
// Koureo — Rewards shop service
// ============================================================================
// - `listCatalog(role)` : rewards visible for a given role
// - `listRedemptions(userId)` : user's redemption history
// - `redeem(userId, rewardId)` : atomic RPC call; all checks server-side
// - `pointsToEuros(points)` : 1 pt = 0.01 € helper
// ============================================================================

import { supabase } from './supabase/client';

export type RewardAccessibleTo = 'student' | 'teacher' | 'both';
export type RewardType =
  | 'voucher'        // credit to spend on the platform
  | 'free_class'     // a fully-paid class
  | 'credit'         // platform credit (teacher side)
  | 'premium'        // premium feature / physical pack
  | 'device'         // big-ticket hardware (iPhone…)
  | 'trip';          // travel

export type RedemptionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'fulfilled'
  | 'cancelled';

export interface Reward {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  costPoints: number;
  euroValue: number | null;
  type: RewardType | null;
  accessibleTo: RewardAccessibleTo;
  badge: string | null;
  active: boolean;
  stock: number | null;
  sortOrder: number;
}

export interface Redemption {
  id: string;
  userId: string;
  role: 'student' | 'teacher' | null;
  rewardId: string;
  rewardTitleSnapshot: string | null;
  costPoints: number;
  status: RedemptionStatus;
  requestedAt: string;
  validatedAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
}

function rowToReward(row: any): Reward {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    imageUrl: row.image_url,
    costPoints: row.cost_points,
    euroValue: row.euro_value !== null ? Number(row.euro_value) : null,
    type: row.type,
    accessibleTo: row.accessible_to ?? 'both',
    badge: row.badge,
    active: !!row.active,
    stock: row.stock,
    sortOrder: row.sort_order ?? 100,
  };
}

function rowToRedemption(row: any): Redemption {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    rewardId: row.reward_id,
    rewardTitleSnapshot: row.reward_title_snapshot,
    costPoints: row.cost_points,
    status: row.status,
    requestedAt: row.requested_at,
    validatedAt: row.validated_at,
    shippedAt: row.shipped_at,
    cancelledAt: row.cancelled_at,
  };
}

export const rewardsService = {
  // List rewards visible to the given role (student/teacher).
  // Teacher sees teacher + both ; student sees student + both.
  async listCatalog(role: 'student' | 'teacher'): Promise<Reward[]> {
    const { data, error } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('active', true)
      .in('accessible_to', [role, 'both'])
      .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data.map(rowToReward);
  },

  async listRedemptions(userId: string): Promise<Redemption[]> {
    const { data, error } = await supabase
      .from('rewards_redemptions')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToRedemption);
  },

  // Atomic redemption — all checks happen server-side in redeem_reward RPC.
  // Throws on low balance / role mismatch / out of stock with a friendly msg.
  async redeem(userId: string, rewardId: string): Promise<string> {
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_user_id: userId,
      p_reward_id: rewardId,
    });
    if (error) {
      // Map Postgres errcodes to human-readable fr-FR messages
      const m = error.message ?? '';
      if (m.includes('Solde insuffisant')) {
        throw new Error('Solde insuffisant pour cette récompense.');
      }
      if (m.includes('rupture de stock')) {
        throw new Error('Récompense épuisée, reviens plus tard.');
      }
      if (m.includes('pour votre rôle')) {
        throw new Error('Cette récompense est réservée à un autre rôle.');
      }
      if (m.includes('non disponible')) {
        throw new Error('Récompense temporairement indisponible.');
      }
      throw new Error(m || 'Échange impossible');
    }
    return data as string;
  },

  // 1 point = 0.01 €
  pointsToEuros(points: number): number {
    return points / 100;
  },
};
