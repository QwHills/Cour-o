// ============================================================================
// Koureo — Loyalty points config
// ============================================================================
// Single source of truth for all point values. Tune these numbers to adjust
// the economy without touching the rest of the code.
//
// When preparing the rewards shop (future work), reason about prices by
// checking `POINTS_CONFIG` × expected frequency × avg commission (12%) to
// ensure the platform stays profitable.
// ============================================================================

export type PointsEventType =
  // Teacher ----------------------------------------------------------------
  | 'teacher_first_published_class'
  | 'teacher_paid_booking'
  | 'teacher_completed_class'
  | 'teacher_referred_student_signup'
  | 'teacher_referred_student_first_booking'
  | 'teacher_monthly_10_completed_classes_bonus'
  // Student ----------------------------------------------------------------
  | 'student_signup'
  | 'student_first_booking'
  | 'student_completed_class'
  | 'student_3_bookings_month_bonus'
  | 'student_new_category_bonus'
  | 'student_referral_first_booking';

export const POINTS_CONFIG: Record<PointsEventType, { points: number; label: string }> = {
  // Teacher ----------------------------------------------------------------
  teacher_first_published_class: { points: 20, label: 'Premier cours publié' },
  teacher_paid_booking: { points: 10, label: 'Réservation payée' },
  teacher_completed_class: { points: 15, label: 'Cours effectué' },
  teacher_referred_student_signup: { points: 50, label: 'Élève inscrit via votre lien' },
  teacher_referred_student_first_booking: {
    points: 30,
    label: 'Première réservation d\'un filleul',
  },
  teacher_monthly_10_completed_classes_bonus: {
    points: 100,
    label: 'Bonus 10 cours complétés dans le mois',
  },

  // Student ----------------------------------------------------------------
  student_signup: { points: 10, label: 'Bienvenue sur Koureo' },
  student_first_booking: { points: 10, label: 'Première réservation' },
  student_completed_class: { points: 15, label: 'Cours effectué' },
  student_3_bookings_month_bonus: { points: 20, label: 'Bonus 3 cours dans le mois' },
  student_new_category_bonus: { points: 30, label: 'Nouvelle catégorie découverte' },
  student_referral_first_booking: { points: 50, label: 'Ami parrainé qui réserve' },
};

// Convenience helpers
export function pointsFor(type: PointsEventType): number {
  return POINTS_CONFIG[type].points;
}

export function labelFor(type: PointsEventType): string {
  return POINTS_CONFIG[type].label;
}

export function roleFor(type: PointsEventType): 'teacher' | 'student' {
  return type.startsWith('teacher_') ? 'teacher' : 'student';
}
