import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStripe } from '../../services/stripe/stripePlatform';
import { coursesService } from '../../services/courses.service';
import { bookingsService } from '../../services/bookings.service';
import { paymentsService } from '../../services/payments.service';
import { authService } from '../../services/auth.service';
import { creditsService } from '../../services/credits.service';
import { OwnerRef } from '../../types/domain';
import {
  calculateCommission,
  formatCommissionLabel,
} from '../../services/commission.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import { formatFullDate, formatTimeLabel, formatDuration } from '../../utils/date';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import CancellationNotice from '../../components/CancellationNotice';

export default function CheckoutScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { courseId } = route.params;
  // Support both single sessionId (legacy) and multi-session sessionIds
  const sessionIds: string[] = route.params.sessionIds
    ?? (route.params.sessionId ? [route.params.sessionId] : []);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const course = coursesService.get(courseId);
  const sessions = useMemo(
    () =>
      sessionIds
        .map((id) => coursesService.getSession(id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [sessionIds],
  );
  const [loading, setLoading] = useState(false);

  if (!course || sessions.length === 0 || !course.teacher) {
    return (
      <View style={styles.container}>
        <Text>Erreur : données introuvables</Text>
      </View>
    );
  }

  const { class: cls, teacher: pro } = course;
  const count = sessions.length;
  const unitPrice = cls.price;
  const totalPrice = unitPrice * count;
  const commissionUnit = calculateCommission(unitPrice);
  const commissionTotal = commissionUnit.commissionAmount * count;
  const proTotal = commissionUnit.proAmount * count;
  const user = authService.getCurrentUser();
  const hasPending = user ? bookingsService.hasPendingQuestionnaire(user.id) : false;

  // Credits available for this course's seller (teacher or organization).
  const owner: OwnerRef = {
    type: cls.ownerType ?? 'teacher',
    id: cls.ownerId ?? cls.teacherId,
  };
  const creditsBalance = user ? creditsService.getBalance(user.id, owner) : 0;
  const canPayWithCredits = !cls.isFree && creditsBalance >= count;

  // Default to credits when the student has enough. They can still switch
  // back to card via the toggle below.
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credits'>(
    canPayWithCredits ? 'credits' : 'cash',
  );

  const handlePay = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Free course → direct booking for each session, no Stripe
      if (cls.isFree) {
        const bookingIds: string[] = [];
        for (const s of sessions) {
          const b = await bookingsService.createBooking(user.id, s.id);
          bookingIds.push(b.id);
        }
        navigation.replace('BookingConfirmed', {
          bookingId: bookingIds[0],
          bookingIds,
        });
        return;
      }

      // Credits path → no Stripe, deduct 1 credit per session from the
      // student's wallet for this owner. bookingsService.createBooking
      // handles the wallet decrement atomically via the DB RPC.
      if (paymentMethod === 'credits') {
        if (creditsBalance < count) {
          throw new Error(
            `Crédits insuffisants (${creditsBalance} dispo, ${count} requis).`,
          );
        }
        const bookingIds: string[] = [];
        for (const s of sessions) {
          const b = await bookingsService.createBooking(user.id, s.id, {
            paymentMethod: 'credits',
          });
          bookingIds.push(b.id);
        }
        navigation.replace('BookingConfirmed', {
          bookingId: bookingIds[0],
          bookingIds,
        });
        return;
      }

      // Paid course → Stripe PaymentSheet flow with the total (unitPrice × count)
      const sheet = await paymentsService.createPaymentSheet({
        amount: totalPrice,
        currency: 'eur',
        bookingReference: `session_multi_${sessions.map((s) => s.id).join('_')}`,
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Koureo',
        paymentIntentClientSecret: sheet.paymentIntentClientSecret,
        customerId: sheet.customerId,
        customerEphemeralKeySecret: sheet.ephemeralKeySecret,
        defaultBillingDetails: {
          email: user.email,
          name: user.name,
        },
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);

      const { error: sheetError } = await presentPaymentSheet();
      if (sheetError) {
        if (sheetError.code !== 'Canceled') {
          throw new Error(sheetError.message);
        }
        return;
      }

      // Payment succeeded → create one booking per session
      const bookingIds: string[] = [];
      for (const s of sessions) {
        const b = await bookingsService.createBooking(user.id, s.id);
        bookingIds.push(b.id);
      }
      navigation.replace('BookingConfirmed', {
        bookingId: bookingIds[0],
        bookingIds,
      });
    } catch (e: any) {
      Alert.alert('Paiement échoué', e.message ?? 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const multi = count > 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {multi ? `Paiement (${count} créneaux)` : 'Paiement'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* Récap cours */}
        <Card style={styles.block}>
          <View style={styles.recapRow}>
            <Image source={{ uri: cls.imageUrl }} style={styles.thumb} />
            <View style={styles.recapInfo}>
              <Badge label={cls.category} variant="primary" small />
              <Text style={styles.classTitle}>{cls.title}</Text>
              <Text style={styles.proName}>avec {pro.displayName}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Session list — one line per selected slot */}
          <Text style={styles.sessionsTitle}>
            {multi ? `${count} séances` : 'Séance'}
            <Text style={styles.sessionsTitleMeta}> · {formatDuration(cls.durationMinutes)} chacune</Text>
          </Text>
          {sessions.map((s, idx) => (
            <View key={s.id} style={styles.sessionLine}>
              <View style={styles.sessionBullet}>
                <Text style={styles.sessionBulletText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDate}>{formatFullDate(s.startsAt)}</Text>
                <Text style={styles.sessionTime}>{formatTimeLabel(s.startsAt)}</Text>
              </View>
              {!cls.isFree && (
                <Text style={styles.sessionPrice}>{unitPrice.toFixed(2)}€</Text>
              )}
            </View>
          ))}
        </Card>

        {/* Détail prix */}
        {cls.isFree ? (
          <Card style={styles.block}>
            <Text style={styles.sectionTitle}>
              {multi ? 'Séances gratuites' : 'Cours gratuit'}
            </Text>
            <Text style={styles.freeText}>
              Aucun paiement requis. Ce cours est gratuit dans le cadre de la
              phase d'évaluation du professeur.
            </Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>0,00€</Text>
            </View>
          </Card>
        ) : (
          <>
            <Card style={styles.block}>
              <Text style={styles.sectionTitle}>Détail du prix</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  {unitPrice.toFixed(2)}€ × {count} séance{count > 1 ? 's' : ''}
                </Text>
                <Text style={styles.priceValue}>{totalPrice.toFixed(2)}€</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabelSmall}>
                  dont commission plateforme ({formatCommissionLabel()})
                </Text>
                <Text style={styles.priceValueSmall}>
                  {commissionTotal.toFixed(2)}€
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabelSmall}>versé au professeur</Text>
                <Text style={styles.priceValueSmall}>
                  {proTotal.toFixed(2)}€
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalValue}>{totalPrice.toFixed(2)}€</Text>
              </View>
            </Card>

            <Card style={styles.block}>
              <Text style={styles.sectionTitle}>Méthode de paiement</Text>

              {creditsBalance > 0 && (
                <TouchableOpacity
                  style={[
                    styles.payMethodRow,
                    paymentMethod === 'credits' && styles.payMethodRowActive,
                    creditsBalance < count && styles.payMethodRowDisabled,
                  ]}
                  activeOpacity={0.85}
                  disabled={creditsBalance < count}
                  onPress={() => setPaymentMethod('credits')}
                >
                  <View
                    style={[
                      styles.radio,
                      paymentMethod === 'credits' && styles.radioActive,
                    ]}
                  >
                    {paymentMethod === 'credits' && <View style={styles.radioDot} />}
                  </View>
                  <View style={[styles.cardIcon, { backgroundColor: '#EEF5F2' }]}>
                    <Text style={styles.cardIconText}>🎟️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>
                      Mes crédits chez {pro.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.cardHint,
                        creditsBalance < count && { color: colors.error },
                      ]}
                    >
                      {creditsBalance} crédit{creditsBalance > 1 ? 's' : ''} dispo
                      {creditsBalance < count
                        ? ` · il t'en faut ${count}`
                        : ` · ${count} utilisé${count > 1 ? 's' : ''} pour cette résa`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.payMethodRow,
                  paymentMethod === 'cash' && styles.payMethodRowActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setPaymentMethod('cash')}
              >
                <View
                  style={[
                    styles.radio,
                    paymentMethod === 'cash' && styles.radioActive,
                  ]}
                >
                  {paymentMethod === 'cash' && <View style={styles.radioDot} />}
                </View>
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>💳</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>Carte Visa •••• 4242</Text>
                  <Text style={styles.cardHint}>Paiement sécurisé via Stripe</Text>
                </View>
              </TouchableOpacity>
            </Card>
          </>
        )}

        <View style={styles.block}>
          <CancellationNotice hoursBefore={cls.cancellationHoursBefore} />
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        {hasPending && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingIcon}>⭐</Text>
            <Text style={styles.pendingText}>
              Tu dois évaluer ton dernier cours avant de pouvoir réserver.
            </Text>
          </View>
        )}
        <Button
          label={
            hasPending
              ? 'Évaluation en attente'
              : loading
                ? (cls.isFree
                    ? 'Réservation…'
                    : paymentMethod === 'credits'
                      ? 'Réservation…'
                      : 'Paiement en cours…')
                : cls.isFree
                  ? (multi ? `Confirmer mes ${count} réservations` : 'Confirmer ma réservation')
                  : paymentMethod === 'credits'
                    ? `Utiliser ${count} crédit${count > 1 ? 's' : ''} et réserver`
                    : `Payer ${totalPrice.toFixed(2)}€`
          }
          onPress={handlePay}
          loading={loading}
          disabled={hasPending}
        />
      </View>
    </View>
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
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  back: { fontSize: 22, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  block: { marginBottom: spacing.md },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 70, height: 70, borderRadius: radii.md },
  recapInfo: { flex: 1, gap: spacing.xs },
  classTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: spacing.xs },
  proName: { fontSize: 13, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  sessionsTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  sessionsTitleMeta: { fontWeight: '500', textTransform: 'none', letterSpacing: 0 },
  sessionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sessionBullet: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionBulletText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  sessionDate: { fontSize: 13, fontWeight: '700', color: colors.text },
  sessionTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sessionPrice: { fontSize: 13, fontWeight: '700', color: colors.text },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  priceLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  priceValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  priceLabelSmall: { fontSize: 12, color: colors.textLight },
  priceValueSmall: { fontSize: 12, color: colors.textLight, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  freeText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  freeBadge: { alignSelf: 'flex-start', backgroundColor: colors.successLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full },
  freeBadgeText: { fontSize: 18, fontWeight: '800', color: colors.success },
  pendingBanner: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D5A0',
  },
  pendingIcon: { fontSize: 20 },
  pendingText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#8B6D00', lineHeight: 18 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  payMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  payMethodRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  payMethodRowDisabled: {
    opacity: 0.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: { fontSize: 20 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
