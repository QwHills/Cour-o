// Pro Points tab — gamification surface for teachers.
//
// Replaces the legacy Promotions/Offers tab. Surfaces the teacher's current
// points balance, how to earn more, and the popular rewards they can spend on.
// Real data comes from `pointsService` (Supabase-backed). The rewards catalog
// + monthly delta are mocked locally for now — the structure is ready for
// wiring to `rewardsService` once those rewards land in Supabase.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '../../services/auth.service';
import { pointsService } from '../../services/points.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';

// Next milestone the user is working toward. Pure UI value — keep in sync
// with the rewards tier system once it ships in Supabase.
const NEXT_TIER_POINTS = 2000;
const TIER_LABEL = 'Niveau Étoile';

// How-to-earn rows shown in the middle section. Values mirror `pointsService.POINTS_CONFIG`
// so a teacher who reads this list sees the actual award amounts.
const EARN_RULES: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  amount: string;
}> = [
  {
    icon: 'calendar-outline',
    iconBg: 'rgba(139,126,200,0.12)',
    iconColor: colors.proAccent,
    title: 'Réservation payée',
    description: "Lorsqu'un élève paie une réservation.",
    amount: '+10',
  },
  {
    icon: 'checkmark-circle-outline',
    iconBg: 'rgba(67,196,176,0.14)',
    iconColor: colors.primary,
    title: 'Cours consommé',
    description: 'Quand un cours réservé est consommé.',
    amount: '+15',
  },
  {
    icon: 'person-add-outline',
    iconBg: 'rgba(232,149,121,0.14)',
    iconColor: '#E89579',
    title: 'Parrainage élève',
    description: "Quand un élève s'inscrit avec votre lien.",
    amount: '+50',
  },
  {
    icon: 'gift-outline',
    iconBg: 'rgba(139,126,200,0.12)',
    iconColor: colors.proAccent,
    title: 'Bonus mensuel',
    description: 'Bonus de fidélité versé chaque mois.',
    amount: '+100',
  },
];

// Popular rewards preview. Once a backend catalog endpoint lands we can swap
// to `rewardsService.listCatalog('teacher')` and remove this constant.
const POPULAR_REWARDS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  costLabel: string;
}> = [
  {
    icon: 'pricetag-outline',
    iconBg: 'rgba(67,196,176,0.14)',
    iconColor: colors.primary,
    title: 'Baisse de commission',
    description: '-1 % de commission pendant 1 mois.',
    costLabel: '500 pts',
  },
  {
    icon: 'trending-up-outline',
    iconBg: 'rgba(232,149,121,0.14)',
    iconColor: '#E89579',
    title: 'Boost visibilité',
    description: 'Mettez votre profil en avant pendant 7 jours.',
    costLabel: '800 pts',
  },
  {
    icon: 'gift-outline',
    iconBg: 'rgba(139,126,200,0.12)',
    iconColor: colors.proAccent,
    title: 'Carte cadeau Kouréo',
    description: "Carte cadeau d'une valeur de 10 €.",
    costLabel: '1 000 pts',
  },
];

export default function ProPointsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  // RewardsShop vit dans le DashboardStack (Accueil) — depuis l'onglet Points
  // (qui n'est pas dans un stack) on remonte au tab parent pour y plonger.
  const goToRewardsShop = () => {
    navigation.getParent()?.navigate('Accueil', {
      screen: 'RewardsShop',
      initial: false,
    });
  };
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [balance, setBalance] = useState<number>(0);
  const [monthDelta, setMonthDelta] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return authService.onChange(() => setUser(authService.getCurrentUser()));
  }, []);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [b, history] = await Promise.all([
          pointsService.getBalance(user.id),
          pointsService.getHistory(user.id, 100),
        ]);
        if (!mounted) return;
        setBalance(b?.totalPoints ?? 0);
        // Tally this month's earned points from the transactions list.
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const delta = (history ?? [])
          .filter((tx) => tx.points > 0 && new Date(tx.createdAt).getTime() >= monthStart)
          .reduce((sum, tx) => sum + tx.points, 0);
        setMonthDelta(delta);
      } catch {
        // Silently fall back to 0/0 — the empty state still renders.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const progressPct = Math.min(100, Math.round((balance / NEXT_TIER_POINTS) * 100));

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Points</Text>
            <Text style={styles.subtitle}>
              Suivez vos points Kouréo et débloquez des avantages.
            </Text>
          </View>
          <View style={styles.tierPill}>
            <Ionicons name="star-outline" size={14} color={colors.proAccent} />
            <Text style={styles.tierPillText}>{TIER_LABEL}</Text>
          </View>
        </View>

        {/* Hero balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceLeft}>
            <View style={styles.balanceIconWrap}>
              <Ionicons name="star" size={22} color={colors.proAccent} />
            </View>
            <View>
              <Text style={styles.balanceValue}>
                {loading ? '…' : balance.toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.balanceLabel}>points disponibles</Text>
              {monthDelta > 0 && (
                <Text style={styles.balanceDelta}>
                  +{monthDelta.toLocaleString('fr-FR')} ce mois-ci
                </Text>
              )}
            </View>
          </View>
          <View style={styles.balanceRight}>
            <View style={styles.tierRing}>
              <View style={[styles.tierRingFill, { height: `${progressPct}%` }]} />
              <Ionicons name="gift" size={22} color={colors.proAccent} style={styles.tierRingIcon} />
            </View>
            <Text style={styles.tierTarget}>Prochain palier</Text>
            <Text style={styles.tierTargetValue}>
              {NEXT_TIER_POINTS.toLocaleString('fr-FR')} pts
            </Text>
          </View>
        </View>

        {/* How to earn */}
        <Text style={styles.sectionLabel}>Comment gagner des points</Text>
        <View style={styles.card}>
          {EARN_RULES.map((rule, idx) => (
            <View
              key={rule.title}
              style={[styles.row, idx < EARN_RULES.length - 1 && styles.rowDivider]}
            >
              <View style={[styles.rowIcon, { backgroundColor: rule.iconBg }]}>
                <Ionicons name={rule.icon} size={20} color={rule.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{rule.title}</Text>
                <Text style={styles.rowDesc}>{rule.description}</Text>
              </View>
              <Text style={styles.rowAmount}>{rule.amount}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </View>
          ))}
        </View>

        {/* Popular rewards */}
        <Text style={styles.sectionLabel}>Récompenses populaires</Text>
        <View style={styles.card}>
          {POPULAR_REWARDS.map((reward, idx) => (
            <TouchableOpacity
              key={reward.title}
              activeOpacity={0.85}
              onPress={goToRewardsShop}
              style={[styles.row, idx < POPULAR_REWARDS.length - 1 && styles.rowDivider]}
            >
              <View style={[styles.rowIcon, { backgroundColor: reward.iconBg }]}>
                <Ionicons name={reward.icon} size={20} color={reward.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{reward.title}</Text>
                <Text style={styles.rowDesc}>{reward.description}</Text>
              </View>
              <Text style={styles.rowCost}>{reward.costLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.85}
          onPress={goToRewardsShop}
        >
          <Ionicons name="gift-outline" size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>Voir les récompenses</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
    paddingBottom: spacing.lg,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(126,181,166,0.18)',
    marginTop: 4,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.proAccent,
    letterSpacing: 0.2,
  },

  // Balance hero
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  balanceLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  balanceIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139,126,200,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceDelta: {
    fontSize: 12,
    color: colors.proAccent,
    fontWeight: '700',
    marginTop: 4,
  },
  balanceRight: {
    alignItems: 'center',
    minWidth: 92,
  },
  tierRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139,126,200,0.10)',
    borderWidth: 3,
    borderColor: 'rgba(139,126,200,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  tierRingFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(139,126,200,0.20)',
  },
  tierRingIcon: {
    zIndex: 1,
  },
  tierTarget: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tierTargetValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },

  // Sections
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },

  // Row (used in both earn + rewards lists)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.proAccent,
    minWidth: 36,
    textAlign: 'right',
  },
  rowCost: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.proAccent,
    minWidth: 64,
    textAlign: 'right',
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.proAccent,
    paddingVertical: 16,
    borderRadius: radii.full,
    marginTop: spacing.sm,
    ...shadows.buttonPro,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
