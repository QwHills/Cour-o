// Domain types — source of truth for the whole app
// Matches Supabase schema in services/supabase/schema.sql

export type Role = 'user' | 'pro';

// Niveau d'accès plate-forme. Indépendant de `role` : un admin peut aussi être
// 'user' ou 'pro' (utile en dev/test). Le flag est attribué manuellement en SQL
// (jamais via signup) — voir supabase/migrations_admin.sql.
export type PlatformAccess = 'admin' | 'standard';
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'all';
export type ClassFormat = 'individual' | 'group';
export type Category =
  | 'Yoga'
  | 'Danse'
  | 'Musique'
  | 'Sport'
  | 'Bien-être'
  | 'Langues'
  | 'Créatif'
  | 'Cuisine'
  | 'Développement personnel'
  | 'Enfants'
  | 'Business';

export type TeacherStatus =
  | 'new_teacher'
  | 'under_review'
  | 'certified_teacher'
  | 'professional';

export type TeacherKind = 'particulier' | 'professional';

export type BookingStatus =
  | 'confirmed'
  | 'cancelled_by_user'
  | 'cancelled_by_pro'
  | 'completed'
  | 'refunded'
  | 'no_show';

export type PaymentStatus = 'pending' | 'succeeded' | 'refunded' | 'failed' | 'not_required';

export type SessionStatus = 'open' | 'full' | 'cancelled' | 'past';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
  isAdmin?: boolean;
  createdAt: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  kind: TeacherKind;
  status: TeacherStatus;
  displayName: string;
  bio: string;
  photoUrl: string;
  categories: Category[];
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  // Certification metrics (computed / cached)
  freeClassesCompleted: number;
  avgValidationScore: number; // 0..5
  validationResponseCount: number;
  certifiedAt?: string;
  stripeAccountId?: string;
  billingConfig?: TeacherBillingConfig;
  photos?: TeacherPhotos;
}

export interface TeacherPhotos {
  place?: string;     // Photo du lieu
  self?: string;      // Photo du professeur
  activity?: string;  // Photo de l'activité en action
}

export interface ClassOffer {
  id: string;
  teacherId: string;
  // Multi-vendor owner: who SELLS this class. For independent teachers this
  // equals the teacher. For a studio class this is the organization, while
  // `teacherId` identifies who actually teaches it (may differ per session).
  ownerType?: OwnerType;
  ownerId?: string;
  title: string;
  category: Category;
  format: ClassFormat;
  level: Level;
  durationMinutes: number;
  price: number; // 0 if free
  isFree: boolean;
  maxParticipants: number;
  description: string;
  imageUrl: string;
  cancellationHoursBefore: number;
}

// Helpers promo — la promo est portée par la séance (pour pouvoir remplir un
// créneau précis), pas par le cours. Une promo est "live" si promoActive &&
// (promoExpiresAt > now || promoExpiresAt is null).
export function isPromoLive(s: { promoActive?: boolean; promoExpiresAt?: string }): boolean {
  if (!s.promoActive) return false;
  if (!s.promoExpiresAt) return true;
  return new Date(s.promoExpiresAt).getTime() > Date.now();
}

export function effectivePrice(cls: ClassOffer, session?: { promoActive?: boolean; promoExpiresAt?: string; promoPrice?: number }): number {
  if (session && isPromoLive(session) && typeof session.promoPrice === 'number') {
    return session.promoPrice;
  }
  return cls.price;
}

export interface ClassSession {
  id: string;
  classId: string;
  startsAt: string;
  endsAt: string;
  bookedCount: number;
  maxParticipants: number;
  status: SessionStatus;
  // Promo par séance (le prof peut discounter UNE séance pour la remplir)
  promoPrice?: number;
  promoActive?: boolean;
  promoExpiresAt?: string;
}

export interface Booking {
  id: string;
  userId: string;
  sessionId: string;
  classId: string;
  teacherId: string;
  status: BookingStatus;
  priceTotal: number;
  commissionAmount: number;
  teacherAmount: number;
  createdAt: string;
  cancelDeadline: string;
  sessionStartsAt: string;
  isFree: boolean;
  questionnaireRequired: boolean;
  questionnaireCompleted: boolean;
}

export type EscrowStatus =
  | 'held'           // argent bloqué sur Koureo, cours pas encore eu lieu
  | 'release_pending' // cours terminé, fenêtre 24h en cours
  | 'released'        // 88% versé au pro, 12% à Koureo
  | 'disputed'        // litige signalé, paiement gelé
  | 'refunded';       // remboursé au participant

export type DisputeStatus = 'open' | 'under_review' | 'resolved_refund' | 'resolved_release';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: 'EUR';
  stripePaymentIntentId: string;
  status: PaymentStatus;
  escrowStatus: EscrowStatus;
  // Timing
  createdAt: string;
  courseEndedAt?: string;       // quand le cours se termine
  releaseWindowEndsAt?: string; // courseEndedAt + 24h
  releasedAt?: string;          // quand le versement a été fait
}

export interface Payout {
  id: string;
  teacherId: string;
  bookingId: string;
  grossAmount: number;       // prix total payé par participant
  commissionAmount: number;  // 12% pour Koureo
  netAmount: number;         // 88% pour le pro
  status: PayoutStatus;
  scheduledAt: string;       // quand le versement est prévu
  completedAt?: string;
  stripeTransferId?: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  userId: string;
  teacherId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

// ─── Notifications ───

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'course_starting_soon'
  | 'course_cancelled'
  | 'questionnaire_pending'
  | 'new_message'
  | 'certification_progress'
  | 'payment_received'
  | 'new_review'
  | 'payout_completed'
  | 'offer_suggestion';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  action?: {
    screen: string;
    params?: Record<string, any>;
  };
}

export interface NotificationPreferences {
  bookingReminders: boolean;
  messages: boolean;
  newCourses: boolean;
  favoriteTeacherUpdates: boolean;
  promotional: boolean;
}

// ─── TVA & Facturation ───

export type VatRegime = 'non_assujetti' | 'tva_20' | 'exonere_formation';

export interface TeacherBillingConfig {
  vatRegime: VatRegime;
  vatNumber?: string;        // FR12345678901
  legalName: string;
  siret?: string;
  address: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;     // KOUREO-2026-0001
  bookingId: string;
  teacherId: string;
  participantId: string;
  // Amounts
  priceHT: number;
  vatRate: number;           // 0 or 0.20
  vatAmount: number;
  priceTTC: number;
  commissionHT: number;
  teacherNetAmount: number;
  // Meta
  vatRegime: VatRegime;
  vatMention: string;
  issuedAt: string;
  // Parties
  teacherName: string;
  teacherAddress: string;
  teacherSiret?: string;
  teacherVatNumber?: string;
  participantName: string;
  participantEmail: string;
  // Course
  courseTitle: string;
  courseDate: string;
  courseDuration: string;
}

export interface CancellationPolicy {
  hoursBefore: number;
  refundPercent: number;
}

export type CommissionType = 'fixed' | 'percent' | 'both';

export interface CommissionConfig {
  type: CommissionType;
  fixedAmount?: number;
  percent?: number;
}

export interface Availability {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startHour: string;
  endHour: string;
}

export interface CalendarConnection {
  id: string;
  teacherId: string;
  provider: 'google' | 'apple';
  accessToken?: string;
  connectedAt: string;
}

export interface BusyEvent {
  start: string;
  end: string;
  title?: string;
}

export interface AvailableSlot {
  startsAt: string;
  endsAt: string;
  spotsLeft: number;
  sessionId: string;
}

// --- Validation questionnaires (Airbnb-style trust) ---
export interface QuestionnaireAnswers {
  q1_onTime: boolean;
  q2_asDescribed: boolean;
  q3_serious: boolean;
  q4_recommend: boolean;
  q5_rating: 1 | 2 | 3 | 4 | 5;
}

export interface ValidationQuestionnaire {
  id: string;
  bookingId: string;
  classId: string;
  sessionId: string;
  teacherId: string;
  userId: string;
  answers: QuestionnaireAnswers;
  comment?: string;
  createdAt: string;
}

export interface CertificationThresholds {
  minFreeClasses: number;
  minAvgRating: number;
  minResponseCount: number;
}

export interface PlatformSettings {
  certification: CertificationThresholds;
}

export interface CertificationProgress {
  teacherId: string;
  status: TeacherStatus;
  freeDone: number;
  avgRating: number;
  responses: number;
  thresholds: CertificationThresholds;
  eligible: boolean;
  blockers: string[];
}

// Dashboard KPIs
export interface ProDashboardStats {
  upcomingBookings: number;
  weekRevenue: number;
  fillRate: number;
  totalClasses: number;
  activeClasses: number;
  nextSession?: ClassSession & { classTitle: string };
}

// --- Availability: opening hours, closed periods, candidate slots ---
export type WeekDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface OpeningHourRange {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface DayOpening {
  open: boolean;
  slots: OpeningHourRange[]; // multiple windows per day allowed (ex: 9-12, 14-18)
}

export type WeeklyOpeningHours = Record<WeekDayKey, DayOpening>;

export interface ClosedPeriod {
  id: string;
  label: string;
  start: string; // ISO date "YYYY-MM-DD"
  end: string;   // ISO date "YYYY-MM-DD"
}

// A candidate starting time for a class session, pre-filtered by the teacher's
// opening hours, closed periods and external calendar busy events.
export interface CandidateSlot {
  startsAt: string; // ISO timestamp (local time serialized)
  endsAt: string;
  dayLabel: string; // "Lundi 28 avril"
  timeLabel: string; // "14:00 – 15:30"
}

// Weekly recurring schedule for a class offer (used when publishing a new
// offer). Each weekday maps to a list of start times ("HH:MM").
export type WeeklyPattern = Record<WeekDayKey, string[]>;

// Manually-added participant on a session (trial class, walk-in, friend
// attending without going through the booking flow). Kept in a separate
// table so the real bookings stay clean for billing.
export interface ManualParticipant {
  id: string;
  sessionId: string;
  teacherId: string;
  fullName: string;
  note?: string;
  addedBy: string;
  createdAt: string;
}

// A session flagged as conflicting with another offer of the same teacher,
// or with a personal event from the teacher's synced calendar.
export interface ScheduleConflict {
  startsAt: string;
  endsAt: string;
  dayLabel: string;
  timeLabel: string;
  conflictWith: string; // other offer title, or personal event title
  kind: 'class' | 'calendar';
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-VENDEUR (Phase 1) — Organizations, Products, Credits
// ═══════════════════════════════════════════════════════════════════════════

// A commercial owner (either a teacher running a solo business, or an
// organization like a studio/school). All products, classes, credits and
// bookings are anchored to an owner so the same booking/billing primitives
// work for both models.
export type OwnerType = 'teacher' | 'organization';

export interface OwnerRef {
  type: OwnerType;
  id: string;
}

// --- Organizations -------------------------------------------------------

export type OrganizationKind =
  | 'studio_yoga'
  | 'sport_club'
  | 'dance_school'
  | 'music_school'
  | 'wellness_center'
  | 'association'
  | 'other';

export interface Organization {
  id: string;
  name: string;
  kind: OrganizationKind;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  email?: string;
  phone?: string;
  website?: string;
  legalName?: string;
  siret?: string;
  vatNumber?: string;
  stripeAccountId?: string;
  createdBy: string; // user_id of the admin who created it
  createdAt: string;
}

export type OrganizationMemberRole = 'admin' | 'teacher' | 'staff';

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  teacherId?: string; // set when role === 'teacher' and the user is also in teacher_profiles
  role: OrganizationMemberRole;
  invitedAt: string;
  joinedAt?: string;
}

// --- Products (commercial offers) ----------------------------------------

export type ProductKind = 'single_class' | 'credit_pack' | 'monthly_subscription';

export interface Product {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  name: string;
  description: string;
  kind: ProductKind;
  price: number;
  creditsGranted?: number;     // for packs and subscriptions
  billingInterval?: 'monthly'; // only for monthly_subscription
  validityDays?: number;       // credit validity in days (e.g. 90 for a pack, 30 for a sub)
  active: boolean;
  createdAt: string;
}

// Which classes a product can be used on. Empty list ⇒ all of the owner's
// classes (i.e. "all-access" subscription).
export interface ProductEligibility {
  id: string;
  productId: string;
  classId?: string; // null → covers all owner classes
}

// --- Student purchases & credits -----------------------------------------

export interface StudentPurchase {
  id: string;
  userId: string;
  productId: string;
  ownerType: OwnerType;
  ownerId: string;
  amountPaid: number;
  stripePaymentId?: string;
  purchasedAt: string;
  expiresAt?: string;   // for subs & packs
  autoRenew: boolean;
}

// One wallet per (user, owner) — a student can have several wallets if they
// buy at multiple studios / teachers. Balance is in credits (int).
export interface CreditWallet {
  id: string;
  userId: string;
  ownerType: OwnerType;
  ownerId: string;
  balance: number;
  updatedAt: string;
}

export type CreditTransactionReason =
  | 'purchase'
  | 'booking'
  | 'refund'
  | 'expiry'
  | 'admin_adjust';

export interface CreditTransaction {
  id: string;
  walletId: string;
  delta: number; // +N on purchase, -1 on booking, negative on expiry
  reason: CreditTransactionReason;
  referenceId?: string; // purchase_id or booking_id depending on reason
  createdAt: string;
}
