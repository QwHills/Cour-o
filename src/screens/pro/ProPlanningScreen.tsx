import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { coursesService } from '../../services/courses.service';
import { bookingsService } from '../../services/bookings.service';
import { manualParticipantsService } from '../../services/manualParticipants.service';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import { formatFullDate, formatTimeLabel, formatDateLabel, formatDuration } from '../../utils/date';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import CapacityBar from '../../components/CapacityBar';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { isPromoLive, ClassOffer, ClassSession } from '../../types/domain';

export default function ProPlanningScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const teacherId = useCurrentTeacherId();
  const [, setTick] = useState(0);
  useEffect(() => {
    const u1 = coursesService.onChange(() => setTick((t) => t + 1));
    const u2 = bookingsService.onChange(() => setTick((t) => t + 1));
    const u3 = manualParticipantsService.onChange(() => setTick((t) => t + 1));
    // Always refresh bookings + manual participants on mount so a teacher
    // sees new student bookings without having to log out / log back in.
    bookingsService.load().catch(() => {});
    if (teacherId) {
      manualParticipantsService.loadForTeacher(teacherId).catch(() => {});
    }
    return () => { u1(); u2(); u3(); };
  }, [teacherId]);

  // Also refresh whenever the screen comes back into focus (tapping the
  // Planning tab again after making a booking in another tab).
  useFocusEffect(
    React.useCallback(() => {
      bookingsService.load().catch(() => {});
      if (teacherId) {
        manualParticipantsService.loadForTeacher(teacherId).catch(() => {});
      }
    }, [teacherId]),
  );

  // Helper: real participant count for a given session = real bookings
  // (confirmed/completed) + manual participants. Replaces the stale
  // session.bookedCount from the seed data which wasn't synced with real
  // bookings.
  const countForSession = (sessionId: string): number => {
    if (!teacherId) return 0;
    const realBookings = bookingsService
      .listForTeacher(teacherId)
      .filter(
        (b) =>
          b.sessionId === sessionId &&
          (b.status === 'confirmed' || b.status === 'completed'),
      ).length;
    const manuals = manualParticipantsService.listForSession(sessionId).length;
    return realBookings + manuals;
  };

  const handleCancelSession = (sessionId: string, classTitle: string, bookedCount: number) => {
    Alert.alert(
      `Annuler la session ?`,
      bookedCount > 0
        ? `"${classTitle}" — ${bookedCount} participant${bookedCount > 1 ? 's seront remboursés' : ' sera remboursé'} automatiquement.`
        : `"${classTitle}" — aucun inscrit, l'annulation est sans impact.`,
      [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Annuler la session',
          style: 'destructive',
          onPress: () => {
            coursesService.cancelSession(sessionId);
            Alert.alert('Session annulée ✓', bookedCount > 0
              ? 'Les participants vont être notifiés et remboursés.'
              : 'La session a été retirée de ton planning.');
          },
        },
      ]
    );
  };

  const proClassIds = teacherId
    ? coursesService.listForTeacher(teacherId).map((c) => c.id)
    : [];

  const proSessions = coursesService
    .allSessions()
    .filter((s) => proClassIds.includes(s.classId))
    .filter((s) => new Date(s.startsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  // Group by day
  const grouped: { key: string; date: Date; sessions: typeof proSessions }[] = [];
  for (const s of proSessions) {
    const d = new Date(s.startsAt);
    const key = d.toDateString();
    const existing = grouped.find((g) => g.key === key);
    if (existing) {
      existing.sessions.push(s);
    } else {
      grouped.push({ key, date: d, sessions: [s] });
    }
  }

  // Tab: Semaine / Tout
  const [tab, setTab] = useState<'week' | 'all'>('week');

  // Promo modal — per-session promotion editing
  const [promoModal, setPromoModal] = useState<{ session: ClassSession; cls: ClassOffer } | null>(null);
  const [pmPrice, setPmPrice] = useState('');
  const [pmExpires, setPmExpires] = useState('');

  const openPromo = (session: ClassSession, cls: ClassOffer) => {
    setPmPrice(session.promoPrice != null ? String(session.promoPrice) : '');
    setPmExpires(session.promoExpiresAt ? session.promoExpiresAt.slice(0, 10) : '');
    setPromoModal({ session, cls });
  };

  const savePromo = async (active: boolean) => {
    if (!promoModal) return;
    const priceNum = active ? parseFloat(pmPrice.replace(',', '.')) : undefined;
    if (active && (isNaN(priceNum as number) || (priceNum as number) < 0)) {
      Alert.alert('Tarif invalide', 'Indique un tarif positif.');
      return;
    }
    if (active && (priceNum as number) >= promoModal.cls.price) {
      Alert.alert('Tarif trop élevé', `Le tarif spécial doit être inférieur au prix normal (${promoModal.cls.price}€).`);
      return;
    }
    const expIso = active && pmExpires
      ? new Date(`${pmExpires}T23:59:59`).toISOString()
      : null;
    await coursesService.updateSessionPromo(promoModal.session.id, {
      promoActive: active,
      promoPrice: priceNum,
      promoExpiresAt: expIso,
    });
    setPromoModal(null);
  };

  // Filter to current week if needed
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const displayed = tab === 'week'
    ? grouped.filter((g) => g.date <= weekEnd)
    : grouped;

  const totalSessions = proSessions.length;
  const totalBooked = proSessions.reduce((sum, s) => sum + countForSession(s.id), 0);
  const totalCapacity = proSessions.reduce((sum, s) => sum + s.maxParticipants, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning</Text>
        <Text style={styles.subtitle}>
          {totalSessions} session{totalSessions > 1 ? 's' : ''} à venir
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'week' && styles.tabActive]}
          onPress={() => setTab('week')}
        >
          <Text style={[styles.tabText, tab === 'week' && styles.tabTextActive]}>
            Cette semaine
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            Tout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalBooked}</Text>
          <Text style={styles.statLabel}>inscrits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCapacity - totalBooked}</Text>
          <Text style={styles.statLabel}>places dispo</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>remplissage</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {displayed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>Aucune session prévue</Text>
            <Text style={styles.emptyText}>
              Crée un cours pour commencer à recevoir des réservations.
            </Text>
          </View>
        ) : (
          displayed.map((group) => (
            <View key={group.key} style={styles.dayBlock}>
              {/* Day header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayDot} />
                <Text style={styles.dayTitle}>{formatFullDate(group.date.toISOString())}</Text>
                <Text style={styles.dayCount}>
                  {group.sessions.length} session{group.sessions.length > 1 ? 's' : ''}
                </Text>
              </View>

              {/* Timeline line */}
              <View style={styles.timeline}>
                {group.sessions.map((s, idx) => {
                  const cls = coursesService.getClass(s.classId)!;
                  const realCount = countForSession(s.id);
                  const isFull = realCount >= s.maxParticipants;
                  const isLast = idx === group.sessions.length - 1;

                  return (
                    <View key={s.id} style={styles.sessionRow}>
                      {/* Timeline connector */}
                      <View style={styles.timelineLeft}>
                        <View style={[styles.timelineDot, isFull && styles.timelineDotFull]} />
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>

                      {/* Session card — tap opens participants list */}
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={0.85}
                        onPress={() =>
                          navigation.navigate('SessionParticipants', {
                            sessionId: s.id,
                          })
                        }
                      >
                      <Card style={styles.sessionCard}>
                        <View style={styles.sessionTop}>
                          <View style={styles.sessionInfo}>
                            <Text style={styles.sessionTitle}>{cls.title}</Text>
                            <Text style={styles.sessionTime}>
                              {formatTimeLabel(s.startsAt)} · {formatDuration(cls.durationMinutes)}
                            </Text>
                          </View>
                          {isPromoLive(s) && (
                            <Badge label="Offre" variant="primary" small />
                          )}
                          <Badge
                            label={isFull ? 'Complet' : 'Ouvert'}
                            variant={isFull ? 'warning' : 'success'}
                            small
                          />
                        </View>

                        <View style={styles.sessionBottom}>
                          <CapacityBar
                            booked={realCount}
                            max={s.maxParticipants}
                          />
                          <View style={styles.sessionMeta}>
                            <Text style={styles.metaText}>
                              {cls.isFree ? (
                                'Gratuit'
                              ) : isPromoLive(s) && typeof s.promoPrice === 'number' ? (
                                <>
                                  <Text style={styles.metaStrike}>{cls.price}€</Text>{' '}
                                  <Text style={styles.metaPromo}>{s.promoPrice}€</Text> / pers.
                                </>
                              ) : (
                                `${cls.price}€ / pers.`
                              )}
                            </Text>
                            <Text style={styles.metaText}>
                              {realCount > 0
                                ? `${((isPromoLive(s) && typeof s.promoPrice === 'number' ? s.promoPrice : cls.price) * realCount)}€ prévus`
                                : 'Aucune inscription'}
                            </Text>
                          </View>
                          {!cls.isFree && (
                            <TouchableOpacity
                              style={isPromoLive(s) ? styles.promoBtnActive : styles.promoBtn}
                              onPress={() => openPromo(s, cls)}
                            >
                              <Text style={isPromoLive(s) ? styles.promoBtnTextActive : styles.promoBtnText}>
                                {isPromoLive(s) ? `Offre spéciale active · -${cls.price - (s.promoPrice || 0)}€` : '⚡ Remplir cette session'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() =>
                              handleCancelSession(s.id, cls.title, realCount)
                            }
                          >
                            <Text style={styles.cancelBtnText}>Annuler la session</Text>
                          </TouchableOpacity>
                        </View>
                      </Card>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Promo edit modal */}
      <Modal
        visible={!!promoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPromoModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {isPromoLive(promoModal?.session ?? {}) ? "Modifier l'offre spéciale" : 'Remplir cette session'}
            </Text>
            <Text style={styles.modalLead}>
              Propose un tarif spécial temporaire pour attirer plus d'élèves sur les places restantes.
            </Text>
            {promoModal && (
              <Text style={styles.modalSubtitle}>
                {promoModal.cls.title} · {formatDateLabel(promoModal.session.startsAt)} {formatTimeLabel(promoModal.session.startsAt)} · Prix normal {promoModal.cls.price}€
              </Text>
            )}
            <Input
              label="Tarif spécial (€)"
              placeholder="Ex : 13"
              value={pmPrice}
              onChangeText={setPmPrice}
              keyboardType="numeric"
            />
            <Input
              label="Valable jusqu'au"
              placeholder="2026-12-31"
              value={pmExpires}
              onChangeText={setPmExpires}
              hint="Laisse vide si tu veux que l'offre reste active jusqu'au début de la session."
            />
            <View style={styles.modalActions}>
              {isPromoLive(promoModal?.session ?? {}) && (
                <TouchableOpacity
                  style={styles.modalDeactivate}
                  onPress={() => savePromo(false)}
                >
                  <Text style={styles.modalDeactivateText}>Retirer l'offre</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setPromoModal(null)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <View style={{ width: spacing.sm }} />
              <Button label="Lancer l'offre spéciale" onPress={() => savePromo(true)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 58,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
  },
  tabActive: {
    backgroundColor: colors.text,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.proAccent,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  dayBlock: {
    marginBottom: spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.proAccent,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  dayCount: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
  },
  timeline: {},
  sessionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.successLight,
  },
  timelineDotFull: {
    backgroundColor: colors.warning,
    borderColor: colors.warningLight,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  sessionCard: {
    flex: 1,
    marginBottom: spacing.md,
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sessionTime: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionBottom: {
    gap: spacing.sm,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
  },
  metaStrike: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  metaPromo: {
    color: colors.primary,
    fontWeight: '700',
  },
  promoBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: '#ecfbf7',
    borderWidth: 1,
    borderColor: '#a8ebdc',
  },
  promoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  promoBtnActive: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  promoBtnTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,23,20,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.sheet,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  modalLead: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  modalActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalDeactivate: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalDeactivateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  modalCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
