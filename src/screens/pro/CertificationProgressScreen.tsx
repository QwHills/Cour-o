import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { teachersService } from '../../services/teachers.service';
import { getTeacherById } from '../../data/mockTeachers';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import TeacherBadge from '../../components/TeacherBadge';
import { CertificationProgress } from '../../types/domain';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';

export default function CertificationProgressScreen() {
  const navigation = useNavigation();
  const teacher = getTeacherById(DEMO_TEACHER_ID);
  const [progress, setProgress] = useState<CertificationProgress | null>(null);

  useEffect(() => {
    let mounted = true;
    teachersService.computeProgress(DEMO_TEACHER_ID).then((p) => {
      if (mounted) setProgress(p);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!teacher || !progress) return <View style={styles.container} />;

  const { freeDone, avgRating, responses, thresholds, eligible, blockers } = progress;

  const freeRatio = Math.min(1, freeDone / thresholds.minFreeClasses);
  const ratingRatio = Math.min(1, avgRating / thresholds.minAvgRating);
  const responseRatio = Math.min(1, responses / thresholds.minResponseCount);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Certification</Text>
        <View style={{ width: 24 }} />
      </View>

      <LinearGradient
        colors={[colors.proGradientStart, colors.proGradientEnd]}
        style={styles.hero}
      >
        <Text style={styles.heroEmoji}>🌱</Text>
        <Text style={styles.heroTitle}>Progression vers la certification</Text>
        <Text style={styles.heroSubtitle}>
          {eligible
            ? 'Toutes les conditions sont remplies — tu vas être certifié !'
            : 'Encore quelques étapes pour débloquer les cours payants'}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <TeacherBadge status={teacher.status} />
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Tes métriques</Text>

      <MetricCard
        icon="school-outline"
        label="Cours gratuits donnés"
        current={freeDone}
        target={thresholds.minFreeClasses}
        ratio={freeRatio}
        unit="cours"
        done={freeDone >= thresholds.minFreeClasses}
      />
      <MetricCard
        icon="star-outline"
        label="Note moyenne"
        current={avgRating.toFixed(1)}
        target={`${thresholds.minAvgRating}/5`}
        ratio={ratingRatio}
        unit=""
        done={avgRating >= thresholds.minAvgRating}
      />
      <MetricCard
        icon="chatbubble-outline"
        label="Retours collectés"
        current={responses}
        target={thresholds.minResponseCount}
        ratio={responseRatio}
        unit="retours"
        done={responses >= thresholds.minResponseCount}
      />

      {blockers.length > 0 && (
        <Card style={styles.blockers}>
          <Text style={styles.blockersTitle}>🎯 Pour être certifié</Text>
          {blockers.map((b: string, i: number) => (
            <View key={i} style={styles.blockerRow}>
              <Text style={styles.blockerDot}>•</Text>
              <Text style={styles.blockerText}>{b}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.explainCard}>
        <Text style={styles.explainTitle}>Comment ça marche ?</Text>
        <Text style={styles.explainText}>
          En tant que nouveau professeur, tu commences par proposer{' '}
          <Text style={styles.explainBold}>{thresholds.minFreeClasses} cours gratuits</Text>. Après chaque cours, les participants remplissent un questionnaire d'évaluation.
          {'\n\n'}
          Une fois que tu as atteint une note moyenne de{' '}
          <Text style={styles.explainBold}>{thresholds.minAvgRating}/5</Text> avec suffisamment de retours, tu deviens{' '}
          <Text style={styles.explainBold}>Certifié</Text> et peux proposer des cours payants !
        </Text>
      </Card>
    </ScrollView>
  );
}

function MetricCard({
  icon,
  label,
  current,
  target,
  ratio,
  unit,
  done,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  current: number | string;
  target: number | string;
  ratio: number;
  unit: string;
  done: boolean;
}) {
  return (
    <Card style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={22} color={colors.proAccent} style={styles.metricIcon} />
        <Text style={styles.metricLabel}>{label}</Text>
        {done && <Text style={styles.metricCheck}>✓</Text>}
      </View>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricCurrent}>{current}</Text>
        <Text style={styles.metricTarget}>/ {target} {unit}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${ratio * 100}%`,
              backgroundColor: done ? colors.success : colors.proAccent,
            },
          ]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl },
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
  hero: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    ...shadows.buttonPro,
  },
  heroEmoji: { fontSize: 42, marginBottom: spacing.sm },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: spacing.xs, letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 19 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  metricCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  metricIcon: { fontSize: 22 },
  metricLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  metricCheck: { fontSize: 20, color: colors.success, fontWeight: '800' },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: spacing.sm },
  metricCurrent: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  metricTarget: { fontSize: 13, color: colors.textLight, fontWeight: '600' },
  track: { height: 8, backgroundColor: colors.borderLight, borderRadius: radii.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.full },
  blockers: { marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: '#FFF8E1' },
  blockersTitle: { fontSize: 14, fontWeight: '700', color: '#8B6D00', marginBottom: spacing.sm },
  blockerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  blockerDot: { fontSize: 14, color: '#8B6D00', fontWeight: '800' },
  blockerText: { fontSize: 13, color: '#6B5600', flex: 1 },
  explainCard: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  explainTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  explainText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  explainBold: { fontWeight: '700', color: colors.text },
});
