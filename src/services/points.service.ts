// ============================================================================
// Koureo — Points service (loyalty / rewards)
// ============================================================================
// - `award()`   : add points for an event. Idempotent via (user_id, type, source_id).
// - `getBalance()` / `getHistory()` : simple read wrappers.
// - `getRawConfig()` : expose the config so UI can show "X pts" labels consistently.
//
// The real award work happens inside the Postgres `award_points` RPC so it's
// atomic and can only be invoked with row-level-security respected. Client
// calls are safe to retry — duplicates are silently ignored server-side.
// ============================================================================

import { supabase } from './supabase/client';
import {
  POINTS_CONFIG,
  PointsEventType,
  labelFor,
  pointsFor,
  roleFor,
} from './points/pointsConfig';

export interface PointsTransaction {
  id: string;
  userId: string;
  role: 'teacher' | 'student';
  type: PointsEventType | string;
  sourceId: string | null;
  label: string;
  points: number;
  status: 'pending' | 'validated' | 'cancelled';
  createdAt: string;
  validatedAt: string | null;
}

export interface PointsBalance {
  userId: string;
  role: 'teacher' | 'student';
  totalPoints: number;
  updatedAt: string;
}

function rowToTx(row: any): PointsTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    type: row.type,
    sourceId: row.source_id,
    label: row.label,
    points: row.points,
    status: row.status,
    createdAt: row.created_at,
    validatedAt: row.validated_at,
  };
}

export const pointsService = {
  // Award points for a domain event. Silently no-ops if already awarded for
  // the same (userId, type, sourceId) — safe to call on retry.
  async award(input: {
    userId: string;
    type: PointsEventType;
    sourceId?: string | null;
    // Custom label overrides the default from POINTS_CONFIG (rare).
    label?: string;
    // For "pending" awards that must later be validated (e.g. course not yet
    // consumed). Defaults to 'validated'.
    status?: 'pending' | 'validated';
  }): Promise<void> {
    const { userId, type, sourceId = null, status = 'validated' } = input;
    const { error } = await supabase.rpc('award_points', {
      p_user_id: userId,
      p_role: roleFor(type),
      p_type: type,
      p_label: input.label ?? labelFor(type),
      p_points: pointsFor(type),
      p_source_id: sourceId,
      p_status: status,
    });
    if (error) {
      // Don't crash the calling flow — points are a side effect, not blocking.
      console.warn('[points] award failed:', type, error.message);
    }
  },

  async getBalance(userId: string): Promise<PointsBalance | null> {
    const { data, error } = await supabase
      .from('user_points')
      .select('user_id, role, total_points, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      userId: data.user_id,
      role: data.role,
      totalPoints: data.total_points,
      updatedAt: data.updated_at,
    };
  },

  async getHistory(userId: string, limit = 50): Promise<PointsTransaction[]> {
    const { data, error } = await supabase
      .from('points_transactions')
      .select('id, user_id, role, type, source_id, label, points, status, created_at, validated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(rowToTx);
  },

  // Exposed for UI code that needs to display "+X pts" next to an action.
  getPointsFor(type: PointsEventType): number {
    return pointsFor(type);
  },

  // Full config for a "how do I earn points?" page if we build one later.
  getAllEvents(): Array<{ type: PointsEventType; points: number; label: string }> {
    return Object.entries(POINTS_CONFIG).map(([type, { points, label }]) => ({
      type: type as PointsEventType,
      points,
      label,
    }));
  },
};
