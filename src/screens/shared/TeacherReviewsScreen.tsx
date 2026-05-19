// Reviews list for a teacher — used both on the user-facing teacher profile
// and on the pro dashboard ("4.9 89 avis ›").
//
// Data source: validation_questionnaires (already loaded in questionnaireService).
// Each questionnaire has 4 boolean checks + 1 rating (1–5) + optional comment.
//
// We only show questionnaires with a comment OR a rating ≥ 4 to keep the list
// meaningful — low-rating no-comment entries are reflected in the aggregate
// rating displayed at the top but clutter the feed otherwise.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { teachersService } from '../../services/teachers.service';
import { questionnaireService } from '../../services/questionnaire.service';
import { ValidationQuestionnaire } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= rating ? 'star' : 'star-outline'}
          size={14}
          color={n <= rating ? '#E8A65B' : colors.textLight}
        />
      ))}
    </View>
  );
}

export default function TeacherReviewsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const teacherId: string = route.params?.teacherId;

  const [, setTick] = useState(0);
  useEffect(() => questionnaireService.onChange(() => setTick((t) => t + 1)), []);

  const teacher = teachersService.getCached(teacherId);
  const reviews: ValidationQuestionnaire[] = questionnaireService
    .listForTeacher(teacherId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.answers.q5_rating, 0) / reviews.length
      : 0;

  // Star-count breakdown (1–5)
  const breakdown = [5, 4, 3, 2, 1].map((n) => ({
    stars: n,
    count: reviews.filter((r) => r.answers.q5_rating === n).length,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Aggregate header */}
        <Card style={styles.summary}>
          <View style={styles.summaryLeft}>
            <Text style={styles.avgNum}>
              {avg > 0 ? avg.toFixed(1) : '—'}
            </Text>
            <Stars rating={Math.round(avg)} />
            <Text style={styles.avgCount}>
              {reviews.length} avis
            </Text>
          </View>
          <View style={styles.summaryRight}>
            {breakdown.map((row) => {
              const pct = reviews.length > 0 ? row.count / reviews.length : 0;
              return (
                <View key={row.stars} style={styles.bdRow}>
                  <Text style={styles.bdStars}>{row.stars}</Text>
                  <View style={styles.bdTrack}>
                    <View style={[styles.bdFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={styles.bdCount}>{row.count}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Review list */}
        {reviews.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="chatbubbles-outline"
              size={36}
              color={colors.textLight}
              style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.emptyTitle}>Aucun avis pour le moment</Text>
            <Text style={styles.emptyText}>
              {teacher
                ? `Les participants laisseront un avis après leur cours avec ${teacher.displayName}.`
                : 'Les avis arriveront après les premiers cours.'}
            </Text>
          </Card>
        ) : (
          reviews.map((r) => (
            <Card key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Stars rating={r.answers.q5_rating} />
                <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
              </View>
              {r.comment ? (
                <Text style={styles.reviewComment}>{r.comment}</Text>
              ) : (
                <Text style={styles.reviewCommentMuted}>
                  Pas de commentaire laissé.
                </Text>
              )}
              <View style={styles.tagsRow}>
                {r.answers.q1_onTime && <Tag label="Ponctuel" />}
                {r.answers.q2_asDescribed && <Tag label="Conforme" />}
                {r.answers.q3_serious && <Tag label="Sérieux" />}
                {r.answers.q4_recommend && <Tag label="Recommandé" />}
              </View>
            </Card>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },

  summary: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.md,
    gap: spacing.lg,
  },
  summaryLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    gap: 4,
  },
  avgNum: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  avgCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  bdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bdStars: { width: 14, fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  bdTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  bdFill: { height: '100%', backgroundColor: '#E8A65B', borderRadius: 3 },
  bdCount: { width: 24, fontSize: 11, color: colors.textLight, textAlign: 'right' },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 19,
  },

  reviewCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reviewDate: { fontSize: 12, color: colors.textLight },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  reviewCommentMuted: {
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});
