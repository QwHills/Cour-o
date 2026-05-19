import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '../../services/auth.service';
import {
  rewardsService,
  Redemption,
  RedemptionStatus,
} from '../../services/rewards.service';
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

function statusVisual(status: RedemptionStatus): {
  label: string;
  color: string;
  bg: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'En attente', color: '#A06C00', bg: '#FFF5D6' };
    case 'approved':
      return { label: 'Validée', color: '#2B7A47', bg: '#D8F0E0' };
    case 'fulfilled':
      return { label: 'Envoyée', color: '#1F5F2D', bg: '#C8E8D0' };
    case 'rejected':
      return { label: 'Refusée', color: '#8A2B2B', bg: '#F8D6D6' };
    case 'cancelled':
      return { label: 'Annulée', color: '#555', bg: '#E5E5E5' };
  }
}

export default function MyRedemptionsScreen() {
  const navigation = useNavigation<any>();
  const user = authService.getCurrentUser();
  const [items, setItems] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    rewardsService.listRedemptions(user.id).then((r) => {
      if (!mounted) return;
      setItems(r);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes récompenses</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : items.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="gift-outline"
              size={40}
              color={colors.textLight}
              style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.emptyTitle}>Aucune récompense</Text>
            <Text style={styles.emptyText}>
              Échange tes points dans la boutique pour voir ton historique ici.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => navigation.navigate('RewardsShop')}
            >
              <Text style={styles.emptyCtaText}>Voir la boutique</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          items.map((r) => {
            const v = statusVisual(r.status);
            return (
              <Card key={r.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                      {r.rewardTitleSnapshot ?? 'Récompense'}
                    </Text>
                    <Text style={styles.sub}>
                      {formatDate(r.requestedAt)} · {r.costPoints.toLocaleString('fr-FR')} pts
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: v.bg }]}>
                    <Text style={[styles.badgeText, { color: v.color }]}>{v.label}</Text>
                  </View>
                </View>
              </Card>
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

  empty: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textLight,
    paddingVertical: spacing.xl,
  },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyCta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  card: { marginBottom: spacing.sm, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  sub: { fontSize: 12, color: colors.textSecondary },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
