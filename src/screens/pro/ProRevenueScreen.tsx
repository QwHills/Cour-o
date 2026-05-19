import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { bookingsService } from '../../services/bookings.service';
import { paymentsService } from '../../services/payments.service';
import { coursesService } from '../../services/courses.service';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { formatCommissionLabel } from '../../services/commission.service';
import { formatFullDate } from '../../utils/date';

export default function ProRevenueScreen() {
  const teacherId = useCurrentTeacherId();
  const bookings = teacherId ? bookingsService.listForTeacher(teacherId) : [];
  const completedPayouts = teacherId ? paymentsService.getPayoutsForTeacher(teacherId) : [];
  const pendingPayments = teacherId ? paymentsService.getPendingPayoutsForTeacher(teacherId) : [];
  const openDisputes = teacherId ? paymentsService.getDisputesForTeacher(teacherId) : [];

  const totalReceived = completedPayouts.reduce((sum, p) => sum + p.netAmount, 0);
  const totalPending = bookings
    .filter((b) => !b.isFree && b.status === 'confirmed')
    .reduce((sum, b) => sum + b.teacherAmount, 0);
  const totalCommission = completedPayouts.reduce((sum, p) => sum + p.commissionAmount, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Revenus</Text>

      {/* Hero card */}
      <LinearGradient
        colors={[colors.proGradientStart, colors.proGradientEnd]}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>Versé sur ton compte</Text>
        <Text style={styles.heroValue}>{totalReceived.toFixed(2)}€</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalPending.toFixed(2)}€</Text>
            <Text style={styles.heroStatLabel}>En attente</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{openDisputes.length}</Text>
            <Text style={styles.heroStatLabel}>Litiges</Text>
          </View>
        </View>
      </LinearGradient>

      {/* How it works */}
      <Card style={styles.block}>
        <Text style={styles.blockTitle}>Comment ça marche ?</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Réservation</Text>
            <Text style={styles.stepDesc}>Le participant paie. L'argent est sécurisé sur Koureo.</Text>
          </View>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Cours terminé</Text>
            <Text style={styles.stepDesc}>Fenêtre de 24h pour le participant s'il y a un souci.</Text>
          </View>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepRow}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Versement automatique</Text>
            <Text style={styles.stepDesc}>88% versé sur ton compte, 12% commission Koureo.</Text>
          </View>
        </View>
      </Card>

      {/* Commission info */}
      <Card style={styles.block}>
        <View style={styles.commissionRow}>
          <Text style={styles.commissionLabel}>Commission plateforme</Text>
          <Text style={styles.commissionValue}>{formatCommissionLabel()}</Text>
        </View>
        <View style={styles.commissionBar}>
          <View style={styles.commissionBarPro}>
            <Text style={styles.commissionBarText}>88% pour toi</Text>
          </View>
          <View style={styles.commissionBarPlatform}>
            <Text style={styles.commissionBarTextSmall}>12%</Text>
          </View>
        </View>
        <Text style={styles.commissionHint}>
          Sur chaque réservation payante, tu perçois 88% du montant. Les 12% restants financent la plateforme.
        </Text>
      </Card>

      {/* Pending */}
      {totalPending > 0 && (
        <>
          <Text style={styles.sectionTitle}>En attente de versement</Text>
          {bookings
            .filter((b) => !b.isFree && b.status === 'confirmed')
            .map((b) => {
              const cls = coursesService.getClass(b.classId);
              return (
                <Card key={b.id} style={styles.txCard}>
                  <View style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txTitle}>{cls?.title ?? 'Cours'}</Text>
                      <Text style={styles.txDate}>{formatFullDate(b.sessionStartsAt)}</Text>
                    </View>
                    <View style={styles.txAmounts}>
                      <Text style={styles.txAmount}>{b.teacherAmount.toFixed(2)}€</Text>
                      <Badge label="En attente" variant="warning" small />
                    </View>
                  </View>
                  <View style={styles.txDetail}>
                    <Text style={styles.txDetailText}>Payé : {b.priceTotal.toFixed(2)}€</Text>
                    <Text style={styles.txDetailText}>Commission : -{b.commissionAmount.toFixed(2)}€</Text>
                    <Text style={styles.txDetailBold}>Tu recevras : {b.teacherAmount.toFixed(2)}€</Text>
                  </View>
                </Card>
              );
            })}
        </>
      )}

      {/* Completed */}
      {completedPayouts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Versements effectués</Text>
          {completedPayouts.map((p) => (
            <Card key={p.id} style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>Versement</Text>
                  <Text style={styles.txDate}>{formatFullDate(p.completedAt ?? p.scheduledAt)}</Text>
                </View>
                <View style={styles.txAmounts}>
                  <Text style={[styles.txAmount, { color: colors.success }]}>
                    +{p.netAmount.toFixed(2)}€
                  </Text>
                  <Badge label="Versé" variant="success" small />
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Empty state */}
      {bookings.filter((b) => !b.isFree).length === 0 && completedPayouts.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💶</Text>
          <Text style={styles.emptyTitle}>Aucun revenu pour le moment</Text>
          <Text style={styles.emptyText}>
            Tes revenus apparaîtront ici dès que tes premiers cours payants seront terminés.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.lg, letterSpacing: -0.3 },
  hero: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    ...shadows.buttonPro,
  },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500', letterSpacing: 0.5 },
  heroValue: { fontSize: 34, color: '#FFFFFF', fontWeight: '700', marginTop: spacing.xs, letterSpacing: -0.5 },
  heroRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStat: { flex: 1 },
  heroStatValue: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: spacing.md },
  block: { marginBottom: spacing.md },
  blockTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.proAccent },
  stepTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  stepDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: 2 },
  stepLine: { width: 2, height: 16, backgroundColor: colors.border, marginLeft: 13, marginVertical: 4 },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  commissionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  commissionValue: { fontSize: 13, fontWeight: '700', color: colors.proAccent },
  commissionBar: { flexDirection: 'row', height: 32, borderRadius: radii.md, overflow: 'hidden', marginBottom: spacing.sm },
  commissionBarPro: {
    flex: 88,
    backgroundColor: colors.proAccent,
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  commissionBarText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  commissionBarPlatform: {
    flex: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commissionBarTextSmall: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  commissionHint: { fontSize: 12, color: colors.textLight, lineHeight: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  txCard: { marginBottom: spacing.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  txDate: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  txAmounts: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
  txDetail: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 2,
  },
  txDetailText: { fontSize: 12, color: colors.textLight },
  txDetailBold: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
