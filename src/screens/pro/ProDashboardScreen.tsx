import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { getProDashboard } from '../../data/mockDashboard';
import { getTeacherById } from '../../data/mockTeachers';
import { teachersService } from '../../services/teachers.service';
import { pointsService } from '../../services/points.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import TeacherBadge from '../../components/TeacherBadge';
import ModeSwitchFab from '../../components/ModeSwitchFab';
import { formatFullDate, formatTimeLabel } from '../../utils/date';
import { CertificationProgress } from '../../types/domain';
import { useCurrentTeacher } from '../../hooks/useCurrentTeacher';

export default function ProDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const currentTeacher = useCurrentTeacher();
  const teacherId = currentTeacher?.id;
  // Fall back to getTeacherById cached record while the hook resolves.
  const teacher = teacherId ? (getTeacherById(teacherId) ?? currentTeacher!) : undefined;
  const stats = teacherId ? getProDashboard(teacherId) : { weekRevenue: 0, upcomingBookings: 0, fillRate: 0, activeClasses: 0, totalClasses: 0 };
  const [progress, setProgress] = useState<CertificationProgress | null>(null);
  const [pointsTotal, setPointsTotal] = useState<number>(0);
  const isInEval = teacherId ? teachersService.isInEvaluation(teacherId) : false;
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (!teacherId) return;
    let mounted = true;
    teachersService.computeProgress(teacherId).then((p) => {
      if (mounted) setProgress(p);
    });
    if (currentUser) {
      pointsService.getBalance(currentUser.id).then((b) => {
        if (mounted) setPointsTotal(b?.totalPoints ?? 0);
      });
    }
    return () => {
      mounted = false;
    };
  }, [currentUser?.id, teacherId]);

  // Render a lightweight loading state until the hook resolves the teacher.
  if (!teacher) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 60 }}>
          <Text style={styles.hello}>Chargement…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.hello}>Bonjour,</Text>
          <View style={styles.nameRow}>
            <Text style={styles.proName}>{teacher.displayName}</Text>
          </View>
          <TeacherBadge status={teacher.status} small style={{ marginTop: 6 }} />
        </View>
      </View>

      {isInEval && progress && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('CertificationProgress')}
        >
          <LinearGradient
            colors={[colors.proGradientStart, colors.proGradientEnd]}
            style={styles.certCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.certBadge}>🌱 Phase d'évaluation</Text>
              <Text style={styles.certTitle}>
                {progress.eligible
                  ? "Tu vas être certifié !"
                  : `${progress.freeDone}/${progress.thresholds.minFreeClasses} cours · ${progress.avgRating.toFixed(1)}/5`}
              </Text>
              <Text style={styles.certHint}>
                {progress.blockers.length > 0 ? progress.blockers[0] : 'Conditions remplies'}
              </Text>
            </View>
            <Text style={styles.certArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {!isInEval && (
        <LinearGradient
          colors={[colors.proGradientStart, colors.proGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>Revenus de la semaine</Text>
          <Text style={styles.heroValue}>{stats.weekRevenue.toFixed(2)}€</Text>
          <View style={styles.heroMetaRow}>
            <TouchableOpacity
              style={styles.heroMeta}
              activeOpacity={0.7}
              onPress={() => navigation.getParent()?.navigate('Planning')}
            >
              <Text style={styles.heroMetaValue}>{stats.upcomingBookings}</Text>
              <Text style={styles.heroMetaLabel}>résas à venir ›</Text>
            </TouchableOpacity>
            <View style={styles.heroMetaDivider} />
            <TouchableOpacity
              style={styles.heroMeta}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProStats')}
            >
              <Text style={styles.heroMetaValue}>{Math.round(stats.fillRate * 100)}%</Text>
              <Text style={styles.heroMetaLabel}>remplissage ›</Text>
            </TouchableOpacity>
            <View style={styles.heroMetaDivider} />
            <TouchableOpacity
              style={styles.heroMeta}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('MyPoints')}
            >
              <View style={styles.pointsBadge}>
                <Ionicons name="sparkles" size={14} color="#FFD66B" />
                <Text style={styles.pointsValue}>{pointsTotal}</Text>
              </View>
              <Text style={styles.heroMetaLabel}>points ›</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      <View style={styles.statsGrid}>
        <StatCard
          icon="rocket-outline"
          value={String(stats.activeClasses)}
          label="Offres actives ›"
          onPress={() => navigation.getParent()?.navigate('Offres')}
        />
        <StatCard
          icon="star-outline"
          value={teacher.rating > 0 ? teacher.rating.toFixed(1) : '—'}
          label={`${teacher.reviewCount} avis ›`}
          onPress={() =>
            navigation.navigate('TeacherReviews', { teacherId: teacher.id })
          }
        />
      </View>

      {stats.nextSession && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            navigation.getParent()?.navigate('Planning', {
              // initial: false → PlanningHome reste dans le back stack pour
              // que la flèche retour revienne sur Planning (et pas Dashboard).
              screen: 'SessionParticipants',
              initial: false,
              params: { sessionId: stats.nextSession!.id },
            })
          }
        >
          <Card style={styles.block}>
            <Text style={styles.blockLabel}>PROCHAINE SESSION</Text>
            <Text style={styles.nextTitle}>{stats.nextSession.classTitle}</Text>
            <View style={styles.nextRow}>
              <Text style={styles.nextDate}>
                {formatFullDate(stats.nextSession.startsAt)} · {formatTimeLabel(stats.nextSession.startsAt)}
              </Text>
              <Badge
                label={`${stats.nextSession.bookedCount}/${stats.nextSession.maxParticipants}`}
                variant="pro"
              />
            </View>
          </Card>
        </TouchableOpacity>
      )}

      <Card style={styles.block}>
        <Text style={styles.blockLabel}>RACCOURCIS</Text>
        <View style={styles.shortcutGrid}>
          <Shortcut
            icon="add-circle"
            tint="#43c4b0"
            bg="#ecfbf7"
            label="Nouveau cours"
            onPress={() => navigation.getParent()?.navigate('Offres', { screen: 'CreateClass', initial: false })}
          />
          <Shortcut
            icon="card"
            tint="#7EB5A6"
            bg="#EEF5F2"
            label="Abonnements & packs"
            onPress={() => navigation.navigate('ProOffers')}
          />
          <Shortcut
            icon="calendar"
            tint="#8B7EC8"
            bg="#EEEBF7"
            label="Voir planning"
            onPress={() => navigation.getParent()?.navigate('Planning')}
          />
          <Shortcut
            icon="trending-up"
            tint="#C9A96E"
            bg="#F8F0DC"
            label="Statistiques"
            onPress={() => navigation.navigate('ProStats')}
          />
        </View>
      </Card>
    </ScrollView>
      <ModeSwitchFab />
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Ionicons name={icon} size={22} color={colors.proAccent} style={styles.statIcon} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCard} activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.statCard}>{content}</View>;
}

function Shortcut({
  icon,
  tint,
  bg,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shortcut} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.shortcutIconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  hello: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  proName: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.3 },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    ...shadows.buttonPro,
    gap: spacing.md,
  },
  certBadge: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  certTitle: { fontSize: 22, color: '#FFFFFF', fontWeight: '800', marginTop: spacing.xs, letterSpacing: -0.3 },
  certHint: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
  certArrow: { fontSize: 32, color: '#FFFFFF', fontWeight: '300' },
  heroCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    ...shadows.buttonPro,
  },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 36, color: '#FFFFFF', fontWeight: '800', marginTop: spacing.xs, letterSpacing: -0.5 },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroMeta: { flex: 1 },
  heroMetaValue: { fontSize: 18, color: '#FFFFFF', fontWeight: '800' },
  heroMetaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroMetaDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: spacing.md },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,214,107,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pointsValue: { fontSize: 18, color: '#FFD66B', fontWeight: '800' },
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  statIcon: { fontSize: 24, marginBottom: spacing.xs },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  block: { marginBottom: spacing.md },
  blockLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  nextTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  nextDate: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortcut: {
    width: '48%',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
    gap: 10,
  },
  shortcutIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutIcon: { fontSize: 24 },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },
});
