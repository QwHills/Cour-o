import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { bookingsService } from '../../services/bookings.service';
import { coursesService } from '../../services/courses.service';
import { teachersService } from '../../services/teachers.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import { getCategoryColor, getCategoryIconName } from '../../utils/categoryIcons';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';

export default function ProStatsScreen() {
  const navigation = useNavigation();
  const teacherId = useCurrentTeacherId();
  const [, setTick] = useState(0);
  useEffect(() => coursesService.onChange(() => setTick((t) => t + 1)), []);

  const teacher = teacherId ? teachersService.getCached(teacherId) : undefined;
  if (!teacher || !teacherId) return null;

  const bookings = bookingsService.listForTeacher(teacherId);
  const proClasses = coursesService.listForTeacher(teacherId);
  const proSessions = coursesService
    .allSessions()
    .filter((s) => proClasses.some((c) => c.id === s.classId));

  const totalBookings = bookings.length;
  const paidBookings = bookings.filter((b) => !b.isFree);
  const totalRevenue = paidBookings.reduce((sum, b) => sum + b.teacherAmount, 0);
  const totalSessions = proSessions.length;
  const totalCapacity = proSessions.reduce((sum, s) => sum + s.maxParticipants, 0);
  const totalBooked = proSessions.reduce((sum, s) => sum + s.bookedCount, 0);
  const fillRate = totalCapacity > 0 ? totalBooked / totalCapacity : 0;

  // Stats per class
  const classStats = proClasses.map((cls) => {
    const sessions = proSessions.filter((s) => s.classId === cls.id);
    const booked = sessions.reduce((sum, s) => sum + s.bookedCount, 0);
    const capacity = sessions.reduce((sum, s) => sum + s.maxParticipants, 0);
    const bks = bookings.filter((b) => b.classId === cls.id);
    const revenue = bks.filter((b) => !b.isFree).reduce((sum, b) => sum + b.teacherAmount, 0);
    return {
      cls,
      sessions: sessions.length,
      booked,
      capacity,
      fillRate: capacity > 0 ? booked / capacity : 0,
      revenue,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview */}
        <Text style={styles.sectionLabel}>Vue d'ensemble</Text>
        <View style={styles.statsGrid}>
          <StatTile value={String(totalBookings)} label="Réservations" color={colors.proAccent} />
          <StatTile value={`${totalRevenue.toFixed(0)}€`} label="Revenus nets" color={colors.success} />
          <StatTile value={`${Math.round(fillRate * 100)}%`} label="Remplissage" color={colors.primary} />
          <StatTile value={String(totalSessions)} label="Sessions" color={colors.accent} />
        </View>

        {/* Fill rate visual */}
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Taux de remplissage global</Text>
          <Text style={styles.blockSubtitle}>
            Toutes tes sessions depuis tes débuts (passées + à venir).
          </Text>
          <View style={styles.bigRateRow}>
            <Text style={styles.bigRateValue}>{Math.round(fillRate * 100)}</Text>
            <Text style={styles.bigRatePercent}>%</Text>
          </View>
          <View style={styles.rateBar}>
            <View style={[styles.rateFill, { width: `${fillRate * 100}%` }]} />
          </View>
          <Text style={styles.rateHint}>
            {totalBooked} inscrits sur {totalCapacity} places disponibles
          </Text>
        </Card>

        {/* Per class */}
        <Text style={styles.sectionLabel}>Par cours</Text>
        {classStats.map((item) => (
          <Card key={item.cls.id} style={styles.classCard}>
            <View style={styles.classRow}>
              <View style={[styles.classDot, { backgroundColor: getCategoryColor(item.cls.category) }]}>
                <Ionicons name={getCategoryIconName(item.cls.category)} size={18} color="#fff" />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{item.cls.title}</Text>
                <Text style={styles.classMeta}>
                  {item.sessions} sessions · {item.booked} inscrits
                </Text>
              </View>
              <View style={styles.classRight}>
                <Text style={styles.classRate}>{Math.round(item.fillRate * 100)}%</Text>
                {item.revenue > 0 && (
                  <Text style={styles.classRevenue}>{item.revenue.toFixed(0)}€</Text>
                )}
              </View>
            </View>
            <View style={styles.miniBar}>
              <View style={[styles.miniFill, {
                width: `${item.fillRate * 100}%`,
                backgroundColor: getCategoryColor(item.cls.category),
              }]} />
            </View>
          </Card>
        ))}

        {/* Rating */}
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Note moyenne</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingBig}>{teacher.rating > 0 ? teacher.rating.toFixed(1) : '—'}</Text>
            <View>
              <Text style={styles.ratingStars}>
                {'★'.repeat(Math.round(teacher.rating))}
                {'☆'.repeat(5 - Math.round(teacher.rating))}
              </Text>
              <Text style={styles.ratingCount}>{teacher.reviewCount} avis</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  },
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statTile: {
    width: '48%',
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 4,
  },
  block: { marginBottom: spacing.md },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  blockSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  bigRateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  bigRateValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
  },
  bigRatePercent: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textLight,
    marginLeft: 2,
  },
  rateBar: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  rateFill: {
    height: '100%',
    backgroundColor: colors.proAccent,
    borderRadius: radii.full,
  },
  rateHint: {
    fontSize: 12,
    color: colors.textLight,
  },
  classCard: { marginBottom: spacing.sm },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  classDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classDotText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  classInfo: { flex: 1 },
  className: { fontSize: 14, fontWeight: '700', color: colors.text },
  classMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  classRight: { alignItems: 'flex-end' },
  classRate: { fontSize: 16, fontWeight: '700', color: colors.text },
  classRevenue: { fontSize: 12, color: colors.success, fontWeight: '600', marginTop: 2 },
  miniBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingBig: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  ratingStars: {
    fontSize: 18,
    color: colors.accent,
    letterSpacing: 2,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
