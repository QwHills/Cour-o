import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import {
  pointsService,
  PointsBalance,
  PointsTransaction,
} from '../../services/points.service';
import {
  POINTS_CONFIG,
  PointsEventType,
  roleFor,
} from '../../services/points/pointsConfig';
import { supabase } from '../../services/supabase/client';
import { teachersService } from '../../services/teachers.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';

// Cap the inline history so the screen stays compact. Users can tap
// "Voir tout l'historique" to expand to the full list.
const HISTORY_PREVIEW = 5;

// Event types we intentionally hide from the "Comment gagner des points"
// catalogue. The bonus is still awarded internally — we just don't surface
// it in the marketing list (e.g. the 2nd-tier referral milestone is a less
// motivating headline than the +50 signup bonus that already mentions it).
const HIDDEN_EARN_EVENTS: PointsEventType[] = [
  'teacher_referred_student_first_booking',
];

// Pick a visual hint per event type — only used in the "Comment gagner des
// points" section so the user can scan the catalogue at a glance.
const EVENT_ICON: Record<PointsEventType, keyof typeof Ionicons.glyphMap> = {
  teacher_first_published_class:               'rocket-outline',
  teacher_paid_booking:                        'card-outline',
  teacher_completed_class:                     'checkmark-circle-outline',
  teacher_referred_student_signup:             'person-add-outline',
  teacher_referred_student_first_booking:      'people-outline',
  teacher_monthly_10_completed_classes_bonus:  'trophy-outline',
  student_signup:                              'sparkles-outline',
  student_first_booking:                       'calendar-outline',
  student_completed_class:                     'checkmark-circle-outline',
  student_3_bookings_month_bonus:              'flame-outline',
  student_new_category_bonus:                  'compass-outline',
  student_referral_first_booking:              'gift-outline',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyPointsScreen() {
  const navigation = useNavigation<any>();
  const user = authService.getCurrentUser();

  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [history, setHistory] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [b, h] = await Promise.all([
        pointsService.getBalance(user.id),
        pointsService.getHistory(user.id),
      ]);
      setBalance(b);
      setHistory(h);
      setLoading(false);
    })();
  }, [user?.id]);

  const isTeacher = user?.role === 'pro';
  const total = balance?.totalPoints ?? 0;

  // Build the role-specific catalogue of ways to earn points. We sort by
  // value descending so the most rewarding actions surface first. Some
  // event types are hidden (see HIDDEN_EARN_EVENTS).
  const earnCatalogue = (Object.entries(POINTS_CONFIG) as [PointsEventType, { points: number; label: string }][])
    .filter(([type]) => roleFor(type) === (isTeacher ? 'teacher' : 'student'))
    .filter(([type]) => !HIDDEN_EARN_EVENTS.includes(type))
    .sort((a, b) => b[1].points - a[1].points);

  // Teacher's referral code — fetched lazily so the "Inviter un élève" CTA
  // can produce a personalised share link. Stays null for pure students.
  const [teacherReferralCode, setTeacherReferralCode] = useState<string | null>(null);
  useEffect(() => {
    if (!user || !isTeacher) return;
    let cancelled = false;
    (async () => {
      const teacher = await teachersService.getByUserId(user.id);
      if (cancelled || !teacher) return;
      const { data } = await supabase
        .from('teacher_profiles')
        .select('referral_code')
        .eq('id', teacher.id)
        .maybeSingle();
      if (!cancelled && data?.referral_code) {
        setTeacherReferralCode(data.referral_code);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isTeacher]);

  // Build the share URL + message and trigger the native share sheet
  // (with desktop-web clipboard fallback). Used by the "Inviter un élève"
  // CTA when the screen is rendered for a teacher.
  const handleInviteStudent = async () => {
    if (!user) return;
    const code = teacherReferralCode ?? user.id; // fallback to UUID if code not loaded yet
    const url = `https://koureo.fr/?ref=${encodeURIComponent(code)}`;
    const message =
      `Découvre mes cours sur Koureo ! 🎓\n\n` +
      `En t'inscrivant via ce lien, tu reçois 10 points de bienvenue.\n\n` +
      `${url}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'Koureo · Invitation élève', text: message, url });
      } else if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          Alert.alert('Lien copié ✓', `Le lien a été copié dans ton presse-papiers.\n\n${url}`);
        } else {
          Alert.alert("Ton lien d'invitation", url);
        }
      } else {
        await Share.share({ message, url, title: 'Koureo · Invitation élève' });
      }
    } catch (e) {
      // User cancelled — silent.
    }
  };

  // Trim history to a 5-item preview, expandable on demand.
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW);
  const hasMoreHistory = history.length > HISTORY_PREVIEW;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes points</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — total balance */}
        <LinearGradient
          colors={
            isTeacher
              ? [colors.proGradientStart, colors.proGradientEnd]
              : [colors.primary, '#E89579']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>Total de points</Text>
          <Text style={styles.heroTotal}>{total.toLocaleString('fr-FR')}</Text>
          <Text style={styles.heroSub}>
            {isTeacher
              ? 'Continue à donner des cours pour en gagner davantage.'
              : 'Réserve, participe, parraine — cumule des points à échanger bientôt contre des cadeaux.'}
          </Text>
        </LinearGradient>

        {/* "Inviter un élève" CTA — only for teachers. Tapping the card
            opens the native share sheet with a personalised koureo.fr link
            so the recipient signs up with the right referral attribution. */}
        {isTeacher && (
          <TouchableOpacity
            style={styles.inviteCard}
            activeOpacity={0.9}
            onPress={handleInviteStudent}
          >
            <View style={styles.inviteIcon}>
              <Text style={styles.inviteEmoji}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>Inviter un élève</Text>
              <Text style={styles.inviteSubtitle}>
                Gagne <Text style={{ fontWeight: '800', color: colors.proAccent }}>+50 points</Text> dès qu'un élève
                s'inscrit via ton lien.
              </Text>
            </View>
            <Text style={styles.inviteChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Earn catalogue — "Comment gagner des points" */}
        <Text style={styles.sectionTitle}>Comment gagner des points</Text>
        <Card style={styles.historyCard}>
          {earnCatalogue.map(([type, def], idx) => (
            <View key={type}>
              <View style={styles.earnRow}>
                <View style={styles.earnIconWrap}>
                  <Ionicons
                    name={EVENT_ICON[type] ?? 'star-outline'}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.earnLabel}>{def.label}</Text>
                <Text style={styles.earnPoints}>+{def.points}</Text>
              </View>
              {idx < earnCatalogue.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

        {/* History */}
        <Text style={styles.sectionTitle}>Historique</Text>

        {loading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : history.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={40} color={colors.primary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Aucun point pour le moment</Text>
            <Text style={styles.emptyText}>
              {isTeacher
                ? 'Publie ton premier cours pour gagner tes 20 premiers points.'
                : 'Ton premier point arrive à ta prochaine réservation.'}
            </Text>
          </Card>
        ) : (
          <Card style={styles.historyCard}>
            {visibleHistory.map((tx, idx) => (
              <View key={tx.id}>
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyLabel}>{tx.label}</Text>
                    <Text style={styles.historyDate}>
                      {formatDate(tx.createdAt)}
                      {tx.status === 'pending' ? ' · en attente' : ''}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.historyPoints,
                      tx.status === 'pending' && { color: colors.textLight },
                    ]}
                  >
                    +{tx.points}
                  </Text>
                </View>
                {idx < visibleHistory.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
            {hasMoreHistory && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  activeOpacity={0.7}
                  onPress={() => setShowAllHistory((v) => !v)}
                >
                  <Text style={styles.showMoreText}>
                    {showAllHistory
                      ? 'Réduire'
                      : `Voir tout l'historique (${history.length})`}
                  </Text>
                  <Ionicons
                    name={showAllHistory ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </>
            )}
          </Card>
        )}

        {/* Rewards shop CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('RewardsShop')}
        >
          <Card style={styles.teaser}>
            <Ionicons name="gift-outline" size={28} color={colors.primary} style={styles.teaserIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.teaserTitle}>Boutique récompenses</Text>
              <Text style={styles.teaserText}>
                Échange tes points contre des bons cadeaux, cours offerts et plus.
              </Text>
            </View>
            <Text style={styles.teaserChevron}>›</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('MyRedemptions')}
        >
          <Card style={[styles.teaser, { marginTop: spacing.sm }] as any}>
            <Ionicons name="time-outline" size={28} color={colors.textSecondary} style={styles.teaserIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.teaserTitle}>Mes récompenses</Text>
              <Text style={styles.teaserText}>
                Consulte l'historique de tes échanges et leur statut.
              </Text>
            </View>
            <Text style={styles.teaserChevron}>›</Text>
          </Card>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  hero: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTotal: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textLight,
    paddingVertical: spacing.xl,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
  },
  historyCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  historyDate: { fontSize: 12, color: colors.textLight },
  historyPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    marginLeft: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.borderLight },

  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  earnIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '14', // ~8% tint
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  earnPoints: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },

  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.proAccent + '33',
    ...shadows.card,
  },
  inviteIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.proAccent + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  inviteEmoji: { fontSize: 22 },
  inviteTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  inviteSubtitle: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  inviteChevron: { fontSize: 22, color: colors.proAccent, fontWeight: '700' },

  teaser: {
    marginTop: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  teaserIcon: { fontSize: 28 },
  teaserTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  teaserText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  teaserChevron: { fontSize: 22, color: colors.textLight, fontWeight: '300' },
});
