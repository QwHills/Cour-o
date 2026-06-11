// Pro Accueil — slimmed down to a pilot-mode dashboard.
//
// Heavy management (revenue, products, advanced stats, photos, payouts) lives
// on the web admin at koureo.fr now; this screen is for the teacher's daily
// glance: who's coming, how filled, how many points earned.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { dashboardService } from '../../services/dashboard.service';
import { coursesService } from '../../services/courses.service';
import { bookingsService } from '../../services/bookings.service';
import { manualParticipantsService } from '../../services/manualParticipants.service';
import { pointsService } from '../../services/points.service';
import { notificationsService } from '../../services/notifications.service';
import { useCurrentTeacher } from '../../hooks/useCurrentTeacher';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import ModeSwitchFab from '../../components/ModeSwitchFab';
import { formatTimeLabel } from '../../utils/date';
import { ProDashboardStats } from '../../types/domain';

// Considered "peu rempli" if less than this share of the session capacity
// is booked — triggers the orange badge + alert on the dashboard.
const LOW_FILL_THRESHOLD = 0.4;

export default function ProDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const teacher = useCurrentTeacher();
  const teacherId = teacher?.id;
  const currentUser = authService.getCurrentUser();

  const [stats, setStats] = useState<ProDashboardStats | null>(null);
  const [pointsTotal, setPointsTotal] = useState<number>(0);
  const [unread, setUnread] = useState<number>(0);
  // Hoisted above the early-return below — adding them later in the render
  // function would change hook count between renders and React throws
  // "Rendered more hooks than during the previous render".
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostPct, setBoostPct] = useState<number>(20);

  // Subscribe to bookings/sessions so the "Cette semaine" stats stay live.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const u1 = bookingsService.onChange(() => setTick((t) => t + 1));
    const u2 = coursesService.onChange(() => setTick((t) => t + 1));
    return () => { u1(); u2(); };
  }, []);

  // Reload the stats from Supabase every tick (a booking or a session changed
  // locally) and on teacher resolution. The cached value paints immediately
  // while the fresh query runs.
  useEffect(() => {
    if (!teacherId) return;
    setStats(dashboardService.get(teacherId) ?? null);
    dashboardService.load(teacherId).catch(() => {});
    const unsub = dashboardService.onChange(() => {
      setStats(dashboardService.get(teacherId) ?? null);
    });
    return unsub;
  }, [teacherId, tick]);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh on tab re-focus too — handles "I just booked a class on the
      // web while the dashboard was idle" without waiting for the next tick.
      if (!teacherId) return;
      dashboardService.load(teacherId).catch(() => {});
    }, [teacherId]),
  );

  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;
    pointsService.getBalance(currentUser.id).then((b) => {
      if (mounted) setPointsTotal(b?.totalPoints ?? 0);
    });
    setUnread(notificationsService.countUnread(currentUser.id));
    const unsub = notificationsService.onChange(() => {
      if (mounted) setUnread(notificationsService.countUnread(currentUser.id));
    });
    return () => { mounted = false; unsub(); };
  }, [currentUser?.id]);

  // ───────────────────────────────────────────────────────────────────────
  // ⚠ All hooks (`useMemo`, `useState`, etc.) must be declared BEFORE the
  // early return below — otherwise React sees a different hook count
  // between the loading render and the resolved render and throws #310.
  // ───────────────────────────────────────────────────────────────────────

  const next = stats?.nextSession;
  // Compute the live participant count from actual bookings + walk-ins rather
  // than the denormalized `class_sessions.booked_count`. That column can drift
  // out of sync if a booking-trigger fails or a manual SQL shift bypasses it,
  // which would surface here as "0 inscrits" even though students exist.
  const nextRealCount = useMemo(() => {
    if (!next || !teacherId) return 0;
    const real = bookingsService
      .listForTeacher(teacherId)
      .filter(
        (b) =>
          b.sessionId === next.id &&
          (b.status === 'confirmed' || b.status === 'completed'),
      ).length;
    const manuals = manualParticipantsService.listForSession(next.id).length;
    return real + manuals;
  }, [next?.id, teacherId, stats]);
  // Pull the active session's promo flag straight from the cache so the
  // modal can show a "Retirer l'offre" button when one is in place.
  const nextSessionPromoActive = useMemo(() => {
    if (!next) return false;
    const fresh = coursesService.getSession(next.id);
    return !!fresh?.promoActive;
  }, [next?.id, next?.promoActive]);

  if (!teacher || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </View>
    );
  }

  const recentBookings = stats.recentBookings;
  const nextFillRatio = next ? nextRealCount / Math.max(1, next.maxParticipants) : 0;
  const nextIsLow = next ? nextFillRatio < LOW_FILL_THRESHOLD : false;
  const firstName = (teacher.displayName ?? '').trim().split(/\s+/)[0] ?? '';

  // Boost modal — opens when the prof taps "Booster ce cours" or the
  // "session peu remplie" alert row. Lets them pick a preset discount %
  // (or cancel if they just wanted to check). The applied promo expires
  // at the session start, which is the moment it stops being useful anyway.
  const handleBoost = () => {
    if (!next) return;
    setBoostPct(20);
    setBoostOpen(true);
  };

  const applyBoost = async () => {
    if (!next) return;
    const cls = coursesService.getClass(next.classId);
    if (!cls) return;
    const promoPrice = Math.max(1, Math.round(cls.price * (1 - boostPct / 100)));
    const expires = new Date(next.startsAt).toISOString();
    try {
      await coursesService.updateSessionPromo(next.id, {
        promoActive: true,
        promoPrice,
        promoExpiresAt: expires,
      });
      setBoostOpen(false);
      Alert.alert(
        'Session boostée ✓',
        `Tarif spécial : ${promoPrice}€ au lieu de ${cls.price}€ (-${boostPct}%).`,
      );
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    }
  };

  const handleRemoveBoost = async () => {
    if (!next) return;
    try {
      // promoPrice omis → la colonne promo_price repasse à NULL côté Supabase
      // (updateSessionPromo envoie `promo.promoPrice ?? null`).
      await coursesService.updateSessionPromo(next.id, {
        promoActive: false,
        promoExpiresAt: null,
      });
      setBoostOpen(false);
      Alert.alert('Offre retirée ✓', 'Le tarif normal est restauré.');
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Bonjour</Text>
            <Text style={styles.proName}>{firstName} 👋</Text>
          </View>
          {/* Quick access to messages — Pro inbox screen registered in
              DashboardStack. Using the same stack so `goBack` returns here. */}
          <TouchableOpacity
            style={styles.headerIcon}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProMessages')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* This week summary */}
        <View style={styles.weekCard}>
          <View style={styles.weekTopRow}>
            <Text style={styles.weekLabel}>Cette semaine</Text>
            <View style={styles.weekTopRight}>
              <Ionicons name="trending-up" size={16} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.weekStatsRow}>
            <View style={styles.weekStat}>
              <View style={styles.weekStatIcon}>
                <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.weekStatValue}>{recentBookings}</Text>
                <Text style={styles.weekStatLabel}>réservations</Text>
              </View>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekStat}>
              <View style={styles.weekStatIcon}>
                <Ionicons name="time-outline" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.weekStatValue}>{stats.upcomingBookings > 0 ? stats.upcomingBookings : 0}</Text>
                <Text style={styles.weekStatLabel}>cours à venir</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Next session */}
        {next ? (
          <View style={styles.nextCard}>
            <View style={styles.nextHeader}>
              <Ionicons name="calendar" size={16} color={colors.proAccent} />
              <Text style={styles.nextHeaderLabel}>Prochaine session</Text>
            </View>
            <Text style={styles.nextTitle} numberOfLines={2}>
              {next.classTitle}
            </Text>
            <Text style={styles.nextMeta}>
              {formatNextSessionDate(next.startsAt)} · {formatTimeLabel(next.startsAt)}
            </Text>
            <View style={styles.nextFillRow}>
              <Text style={styles.nextFillCount}>
                {nextRealCount} / {next.maxParticipants}
                <Text style={styles.nextFillCountSuffix}> inscrits</Text>
              </Text>
              <View style={styles.nextFillBar}>
                <View
                  style={[
                    styles.nextFillBarValue,
                    { width: `${Math.min(100, Math.round(nextFillRatio * 100))}%` },
                    nextIsLow && styles.nextFillBarValueLow,
                  ]}
                />
              </View>
              {nextIsLow && (
                <View style={styles.nextFillBadge}>
                  <Text style={styles.nextFillBadgeText}>Peu rempli</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.boostBtn}
              activeOpacity={0.85}
              onPress={handleBoost}
            >
              <Ionicons name="rocket" size={18} color="#FFFFFF" />
              <Text style={styles.boostBtnText}>Booster ce cours</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyNext}>
            <Ionicons name="moon-outline" size={28} color={colors.textLight} />
            <Text style={styles.emptyNextText}>
              Aucune session à venir. Crée-en depuis le dashboard web.
            </Text>
          </View>
        )}

        {/* Points mini card */}
        <TouchableOpacity
          style={styles.pointsCard}
          activeOpacity={0.85}
          onPress={() => navigation.getParent()?.navigate('Points')}
        >
          <View style={styles.pointsIconWrap}>
            <Ionicons name="star" size={20} color={colors.proAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pointsValue}>
              {pointsTotal.toLocaleString('fr-FR')}
            </Text>
            <Text style={styles.pointsLabel}>points disponibles</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </TouchableOpacity>

        {/* Shortcuts */}
        <Text style={styles.sectionLabel}>Raccourcis</Text>
        <View style={styles.shortcutGrid}>
          <Shortcut
            icon="calendar"
            tint={colors.proAccent}
            bg="rgba(139,126,200,0.12)"
            label="Planning"
            onPress={() => navigation.getParent()?.navigate('Planning')}
          />
          <Shortcut
            icon="star"
            tint={colors.primary}
            bg="rgba(67,196,176,0.14)"
            label="Points"
            onPress={() => navigation.getParent()?.navigate('Points')}
          />
          <Shortcut
            icon="people"
            tint="#E89579"
            bg="rgba(232,149,121,0.14)"
            label="Présences"
            onPress={() => navigation.getParent()?.navigate('Présences')}
          />
          <Shortcut
            icon="notifications"
            tint={colors.proAccent}
            bg="rgba(139,126,200,0.12)"
            label="Notifications"
            badge={unread > 0 ? (unread > 9 ? '9+' : String(unread)) : undefined}
            onPress={() =>
              navigation.getParent()?.navigate('Paramètres', {
                screen: 'Notifications',
                initial: false,
              })
            }
          />
        </View>

        {/* Alerts */}
        {(nextIsLow || recentBookings > 0) && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.textSecondary} /> Alertes
            </Text>
            <View style={styles.alertsCard}>
              {nextIsLow && next && (
                <TouchableOpacity
                  style={styles.alertRow}
                  activeOpacity={0.85}
                  onPress={handleBoost}
                >
                  <View style={[styles.alertIcon, { backgroundColor: 'rgba(232,149,121,0.16)' }]}>
                    <Ionicons name="warning" size={18} color="#E89579" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>1 session peu remplie</Text>
                    <Text style={styles.alertDesc}>Booster vos cours pour remplir vos places.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                </TouchableOpacity>
              )}
              {recentBookings > 0 && (
                <TouchableOpacity
                  style={styles.alertRow}
                  activeOpacity={0.85}
                  onPress={() => navigation.getParent()?.navigate('Présences')}
                >
                  <View style={[styles.alertIcon, { backgroundColor: 'rgba(67,196,176,0.14)' }]}>
                    <Ionicons name="person-add" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>
                      {recentBookings} nouvelle{recentBookings > 1 ? 's' : ''} réservation{recentBookings > 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.alertDesc}>De nouveaux élèves vous ont rejoint.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <ModeSwitchFab />

      {/* Boost picker modal */}
      <Modal
        visible={boostOpen && !!next}
        transparent
        animationType="fade"
        onRequestClose={() => setBoostOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="rocket" size={22} color={colors.proAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Booster cette session</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  {next?.classTitle}
                </Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>Choisis la remise</Text>
            <View style={styles.boostChipsRow}>
              {[10, 20, 30, 50].map((pct) => {
                const active = boostPct === pct;
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.boostChip, active && styles.boostChipActive]}
                    activeOpacity={0.85}
                    onPress={() => setBoostPct(pct)}
                  >
                    <Text style={[styles.boostChipText, active && styles.boostChipTextActive]}>
                      -{pct}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {next && (() => {
              const cls = coursesService.getClass(next.classId);
              if (!cls) return null;
              const promoPrice = Math.max(1, Math.round(cls.price * (1 - boostPct / 100)));
              return (
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>Nouveau tarif</Text>
                    <Text style={styles.priceValue}>
                      {promoPrice}€{' '}
                      <Text style={styles.priceStrike}>{cls.price}€</Text>
                    </Text>
                  </View>
                  <View style={styles.savingsPill}>
                    <Text style={styles.savingsPillText}>−{cls.price - promoPrice}€</Text>
                  </View>
                </View>
              );
            })()}

            <Text style={styles.modalFootnote}>
              L'offre spéciale s'arrêtera automatiquement au début de la session.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimary}
              activeOpacity={0.85}
              onPress={applyBoost}
            >
              <Ionicons name="rocket" size={16} color="#FFFFFF" />
              <Text style={styles.modalPrimaryText}>
                {nextSessionPromoActive ? 'Mettre à jour la remise' : 'Appliquer la remise'}
              </Text>
            </TouchableOpacity>
            {nextSessionPromoActive && (
              <TouchableOpacity
                style={styles.modalRemove}
                activeOpacity={0.85}
                onPress={handleRemoveBoost}
              >
                <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                <Text style={styles.modalRemoveText}>Retirer l'offre</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.modalSecondary}
              activeOpacity={0.7}
              onPress={() => setBoostOpen(false)}
            >
              <Text style={styles.modalSecondaryText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatNextSessionDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, tomorrow)) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function Shortcut({
  icon,
  tint,
  bg,
  label,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  label: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.shortcut}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={tint} />
        {badge && (
          <View style={styles.shortcutBadge}>
            <Text style={styles.shortcutBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
    paddingBottom: spacing.lg,
  },

  loadingBox: { padding: 60, flex: 1, justifyContent: 'center' },
  loadingText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  hello: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  proName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },

  // This week card
  weekCard: {
    backgroundColor: colors.proAccent,
    borderRadius: radii.lg,
    padding: spacing.md + 4,
    marginBottom: spacing.lg,
    ...shadows.buttonPro,
  },
  weekTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  weekTopRight: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weekStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weekStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  weekStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: -2,
  },
  weekDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Next session
  nextCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  nextHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.proAccent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nextTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  nextMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  nextFillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  nextFillCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  nextFillCountSuffix: {
    fontWeight: '500',
    color: colors.textSecondary,
  },
  nextFillBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  nextFillBarValue: {
    height: '100%',
    backgroundColor: colors.proAccent,
  },
  nextFillBarValueLow: {
    backgroundColor: '#E89579',
  },
  nextFillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: 'rgba(232,149,121,0.18)',
  },
  nextFillBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9C5436',
    letterSpacing: 0.3,
  },
  boostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.proAccent,
    paddingVertical: 14,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  boostBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  emptyNext: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  emptyNextText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Points mini card
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(139,126,200,0.10)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pointsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: -2,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // Shortcuts grid (4 cards)
  shortcutGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    gap: 6,
    ...shadows.sm,
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  shortcutBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  shortcutBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Alerts
  alertsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // Boost picker modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.cardHover,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(139,126,200,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  boostChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  boostChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  boostChipActive: {
    backgroundColor: 'rgba(139,126,200,0.18)',
    borderColor: colors.proAccent,
  },
  boostChipText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },
  boostChipTextActive: {
    color: colors.proAccent,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  priceStrike: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  savingsPill: {
    backgroundColor: 'rgba(67,196,176,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  savingsPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  modalFootnote: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.proAccent,
    paddingVertical: 14,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modalRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.full,
    backgroundColor: 'rgba(199,95,74,0.10)',
    marginTop: spacing.sm,
  },
  modalRemoveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  modalSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
