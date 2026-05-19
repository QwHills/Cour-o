import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '../../services/auth.service';
import { pointsService } from '../../services/points.service';
import {
  rewardsService,
  Reward,
  RewardType,
} from '../../services/rewards.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';

// Icon + color per reward type for a visual anchor
function typeVisual(type: RewardType | null): {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
} {
  switch (type) {
    case 'voucher':
      return { icon: 'gift-outline', tint: '#E89579' };
    case 'free_class':
      return { icon: 'school-outline', tint: '#6B9F71' };
    case 'credit':
      return { icon: 'card-outline', tint: '#8A7FC8' };
    case 'premium':
      return { icon: 'star-outline', tint: '#C8A24F' };
    case 'device':
      return { icon: 'phone-portrait-outline', tint: '#1A1714' };
    case 'trip':
      return { icon: 'airplane-outline', tint: '#4A8FB8' };
    default:
      return { icon: 'sparkles-outline', tint: colors.primary };
  }
}

export default function RewardsShopScreen() {
  const navigation = useNavigation<any>();
  // Re-read on every auth change — otherwise if the screen mounts before the
  // Supabase session hydrates, getCurrentUser() is null and the loader stays
  // stuck forever.
  const [user, setUser] = useState(() => authService.getCurrentUser());
  useEffect(() => {
    const unsub = authService.onChange(() => setUser(authService.getCurrentUser()));
    return unsub;
  }, []);
  const role: 'student' | 'teacher' = user?.role === 'pro' ? 'teacher' : 'student';

  const [balance, setBalance] = useState<number>(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [b, r] = await Promise.all([
          pointsService.getBalance(user.id),
          rewardsService.listCatalog(role),
        ]);
        if (!mounted) return;
        setBalance(b?.totalPoints ?? 0);
        setRewards(r);
      } catch (e) {
        if (mounted) setLoadError((e as Error).message || 'Erreur de chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id, role]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boutique récompenses</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyRedemptions')}>
          <Ionicons name="time-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance hero */}
        <LinearGradient
          colors={
            role === 'teacher'
              ? [colors.proGradientStart, colors.proGradientEnd]
              : [colors.primary, '#E89579']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>Votre solde</Text>
          <Text style={styles.heroTotal}>{balance.toLocaleString('fr-FR')} pts</Text>
          <Text style={styles.heroSub}>
            soit {rewardsService.pointsToEuros(balance).toFixed(2).replace('.', ',')} € de valeur
          </Text>
        </LinearGradient>

        {loading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : loadError ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color={colors.textLight}
              style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.emptyTitle}>Connexion impossible</Text>
            <Text style={styles.emptyText}>{loadError}</Text>
          </Card>
        ) : rewards.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="gift-outline"
              size={40}
              color={colors.textLight}
              style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.emptyTitle}>Bientôt</Text>
            <Text style={styles.emptyText}>
              De nouvelles récompenses seront ajoutées régulièrement.
            </Text>
          </Card>
        ) : (
          rewards.map((r) => {
            const visual = typeVisual(r.type);
            const canAfford = balance >= r.costPoints;
            const missing = r.costPoints - balance;
            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.88}
                style={styles.rewardCard}
                onPress={() =>
                  navigation.navigate('RewardDetail', { rewardId: r.id })
                }
              >
                <View style={[styles.iconWrap, { backgroundColor: visual.tint + '18' }]}>
                  <Ionicons name={visual.icon} size={26} color={visual.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                      {r.title}
                    </Text>
                    {r.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{r.badge}</Text>
                      </View>
                    )}
                  </View>
                  {r.shortDescription && (
                    <Text style={styles.desc} numberOfLines={2}>
                      {r.shortDescription}
                    </Text>
                  )}
                  <View style={styles.bottomRow}>
                    <Text style={styles.cost}>
                      {r.costPoints.toLocaleString('fr-FR')} pts
                    </Text>
                    {canAfford ? (
                      <Text style={styles.statusOk}>Disponible</Text>
                    ) : (
                      <Text style={styles.statusLocked}>
                        −{missing.toLocaleString('fr-FR')} pts
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

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
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  empty: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textLight,
    paddingVertical: spacing.xl,
  },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  badge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.proAccent,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  desc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 6 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cost: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  statusOk: { fontSize: 12, fontWeight: '700', color: colors.success },
  statusLocked: { fontSize: 12, fontWeight: '600', color: colors.textLight },
});
