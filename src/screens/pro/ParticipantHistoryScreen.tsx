// History of a single student with the current teacher : every booking
// (past + upcoming), payment method per booking, current credit wallet
// balance, and a "Suggérer un abonnement" CTA so the pro can pitch a pack
// or subscription to a regular customer.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { bookingsService } from '../../services/bookings.service';
import { coursesService } from '../../services/courses.service';
import { creditsService } from '../../services/credits.service';
import { productsService } from '../../services/products.service';
import { offerSuggestionsService } from '../../services/offerSuggestions.service';
import { teachersService } from '../../services/teachers.service';
import { authService } from '../../services/auth.service';
import { supabase } from '../../services/supabase/client';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import { Booking, Product } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatFullDate, formatTimeLabel } from '../../utils/date';

interface UserDetails {
  id: string;
  name: string;
  email: string;
}

export default function ParticipantHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const userId: string = route.params.userId;
  // The previous screen may have already passed the student's name to avoid
  // flashing "Chargement…" while the Supabase fetch resolves (or silently
  // fails due to RLS).
  const initialName: string | undefined = route.params.initialName;
  const teacherId = useCurrentTeacherId();

  const [, setTick] = useState(0);
  useEffect(() => {
    const u1 = bookingsService.onChange(() => setTick((t) => t + 1));
    const u2 = creditsService.onChange(() => setTick((t) => t + 1));
    return () => { u1(); u2(); };
  }, []);

  // Fetch the user's profile (now possible thanks to the new RLS policy
  // "users_readable_by_their_teacher"). Seeded with `initialName` so the UI
  // never shows "Chargement…" for a name we already know.
  const [user, setUser] = useState<UserDetails | null>(
    initialName ? { id: userId, name: initialName, email: '' } : null,
  );
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('participant fetch:', error.message);
          return;
        }
        if (data) setUser(data as UserDetails);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // All bookings of this student with the current teacher
  const allBookings = useMemo<Booking[]>(() => {
    if (!teacherId) return [];
    return bookingsService
      .listForTeacher(teacherId)
      .filter((b) => b.userId === userId)
      .sort((a, b) =>
        new Date(b.sessionStartsAt).getTime() - new Date(a.sessionStartsAt).getTime(),
      );
  }, [teacherId, userId]);

  const now = Date.now();
  const past = allBookings.filter(
    (b) => new Date(b.sessionStartsAt).getTime() < now,
  );
  const upcoming = allBookings.filter(
    (b) => new Date(b.sessionStartsAt).getTime() >= now,
  );

  // Payment method breakdown
  const paidBreakdown = useMemo(() => {
    const counts = { cash: 0, credits: 0, free: 0 };
    allBookings.forEach((b) => {
      if (b.isFree) counts.free++;
      else if (b.priceTotal === 0) counts.credits++;
      else counts.cash++;
    });
    return counts;
  }, [allBookings]);

  // Credit wallet with this teacher
  const balance = teacherId
    ? creditsService.getBalance(userId, { type: 'teacher', id: teacherId })
    : 0;

  // Active products this teacher sells — used in the "Suggérer" CTA
  const myActiveProducts = teacherId
    ? productsService.listForOwner({ type: 'teacher', id: teacherId }, { onlyActive: true })
    : [];

  const initial = (user?.name ?? '?').slice(0, 1).toUpperCase();

  // Modal state for picking which offer to suggest
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null); // productId being sent
  const handleOpenPicker = () => {
    if (myActiveProducts.length === 0) {
      Alert.alert(
        'Aucune offre à proposer',
        "Crée d'abord un abonnement ou un pack via Dashboard › Abonnements & packs.",
      );
      return;
    }
    setPickerOpen(true);
  };

  const handlePickProduct = async (product: Product) => {
    if (!teacherId || !user) return;
    setSending(product.id);
    try {
      const teacher = await teachersService.get(teacherId);
      const currentUser = authService.getCurrentUser();
      const result = await offerSuggestionsService.sendSuggestion({
        teacherId,
        teacherUserId: currentUser?.id ?? '',
        teacherDisplayName: teacher?.displayName ?? 'Ton prof',
        student: { id: user.id, name: user.name },
        product,
        unitPaymentsCount: paidBreakdown.cash,
      });
      setPickerOpen(false);
      // Slight delay so the modal close animation finishes before the alert
      setTimeout(() => {
        Alert.alert(
          result.ok ? 'Suggestion envoyée ✓' : 'Suggestion non envoyée',
          result.message ?? '',
        );
      }, 250);
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setSending(null);
    }
  };

  if (!teacherId) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Identité prof non résolue.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Élève</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <Card style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name ?? 'Chargement…'}</Text>
            {user?.email ? (
              <Text style={styles.email}>{user.email}</Text>
            ) : null}
            <View style={styles.kpiRow}>
              <View style={styles.kpi}>
                <Text style={styles.kpiValue}>{past.length}</Text>
                <Text style={styles.kpiLabel}>cours passés</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiValue}>{upcoming.length}</Text>
                <Text style={styles.kpiLabel}>à venir</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiValue}>{balance}</Text>
                <Text style={styles.kpiLabel}>crédit{balance > 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Payment breakdown */}
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Comment il/elle paie</Text>
          <View style={styles.payRow}>
            <PayChip icon="💳" label="Unité" count={paidBreakdown.cash} />
            <PayChip icon="🎟️" label="Crédits" count={paidBreakdown.credits} />
            <PayChip icon="🎁" label="Gratuit" count={paidBreakdown.free} />
          </View>
          {paidBreakdown.cash >= 3 && balance === 0 && (
            <View style={styles.suggestBox}>
              <Text style={styles.suggestText}>
                💡 Cet élève a payé {paidBreakdown.cash} fois à l'unité sans
                jamais prendre d'abonnement. C'est le moment de lui proposer
                un pack !
              </Text>
              <Button
                label="Suggérer une offre"
                variant="pro"
                onPress={handleOpenPicker}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
        </Card>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Prochains cours · {upcoming.length}</Text>
            {upcoming.map((b) => (
              <BookingHistoryRow key={b.id} booking={b} />
            ))}
          </View>
        )}

        {/* Past */}
        {past.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Historique · {past.length}</Text>
            {past.map((b) => (
              <BookingHistoryRow key={b.id} booking={b} past />
            ))}
          </View>
        )}

        {allBookings.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Aucun cours pour l'instant</Text>
            <Text style={styles.emptyText}>
              Cet élève n'a pas encore réservé chez toi via l'app.
            </Text>
          </View>
        )}
      </ScrollView>

      <OfferPickerModal
        visible={pickerOpen}
        studentName={user?.name ?? 'cet élève'}
        products={myActiveProducts}
        sendingProductId={sending}
        onPick={handlePickProduct}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function OfferPickerModal({
  visible,
  studentName,
  products,
  sendingProductId,
  onPick,
  onClose,
}: {
  visible: boolean;
  studentName: string;
  products: Product[];
  sendingProductId: string | null;
  onPick: (p: Product) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pickerStyles.backdrop}>
        <TouchableOpacity style={pickerStyles.backdropTap} activeOpacity={1} onPress={onClose} />
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>Quelle offre lui suggérer ?</Text>
          <Text style={pickerStyles.subtitle}>
            {studentName.split(' ')[0]} recevra une notification + un message dans la
            messagerie avec le détail de cette offre.
          </Text>

          <ScrollView
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {products.map((p) => {
              const isSending = sendingProductId === p.id;
              const subline =
                p.kind === 'monthly_subscription'
                  ? `Abonnement · ${p.price.toFixed(0)} € / mois`
                  : p.kind === 'credit_pack'
                    ? `Pack · ${p.creditsGranted ?? '?'} cours · ${p.price.toFixed(0)} €`
                    : `${p.price.toFixed(0)} €`;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[pickerStyles.row, isSending && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                  disabled={!!sendingProductId}
                  onPress={() => onPick(p)}
                >
                  <View style={pickerStyles.rowIcon}>
                    <Ionicons
                      name={p.kind === 'monthly_subscription' ? 'repeat-outline' : 'pricetag-outline'}
                      size={20}
                      color={colors.proAccent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pickerStyles.rowTitle}>{p.name}</Text>
                    <Text style={pickerStyles.rowSub}>{subline}</Text>
                  </View>
                  <Text style={pickerStyles.rowChevron}>
                    {isSending ? '…' : '›'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={pickerStyles.cancel}>
            <Text style={pickerStyles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26,23,20,0.4)', justifyContent: 'flex-end' },
  backdropTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.proAccent + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowChevron: { fontSize: 22, color: colors.proAccent, fontWeight: '700' },
  cancel: { paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  cancelText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
});

function PayChip({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <View style={styles.payChip}>
      <Text style={styles.payIcon}>{icon}</Text>
      <Text style={styles.payCount}>{count}</Text>
      <Text style={styles.payLabel}>{label}</Text>
    </View>
  );
}

function BookingHistoryRow({ booking, past }: { booking: Booking; past?: boolean }) {
  const cls = coursesService.getClass(booking.classId);
  const paidWith =
    booking.priceTotal === 0 && !booking.isFree
      ? 'credits'
      : booking.isFree
        ? 'free'
        : 'cash';
  const paidBadge =
    paidWith === 'credits'
      ? { label: '🎟️ Crédit', variant: 'primary' as const }
      : paidWith === 'free'
        ? { label: 'Gratuit', variant: 'success' as const }
        : { label: `💳 ${booking.priceTotal.toFixed(0)}€`, variant: 'neutral' as const };

  return (
    <Card style={[styles.historyRow, past ? { opacity: 0.7 } : null] as any}>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyTitle} numberOfLines={1}>
          {cls?.title ?? 'Cours'}
        </Text>
        <Text style={styles.historyMeta}>
          {formatFullDate(booking.sessionStartsAt)} · {formatTimeLabel(booking.sessionStartsAt)}
        </Text>
      </View>
      <Badge label={paidBadge.label} variant={paidBadge.variant} small />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 80, color: colors.textLight },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.primary },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  kpi: { alignItems: 'center', flex: 1 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: colors.proAccent, letterSpacing: -0.3 },
  kpiLabel: { fontSize: 10, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  block: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md },
  blockTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  payRow: { flexDirection: 'row', gap: spacing.sm },
  payChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  payIcon: { fontSize: 22 },
  payCount: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 2 },
  payLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },

  suggestBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#ecfbf7',
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  suggestText: { fontSize: 12, color: colors.text, lineHeight: 17 },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  historyMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  emptyState: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.lg, gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
});
