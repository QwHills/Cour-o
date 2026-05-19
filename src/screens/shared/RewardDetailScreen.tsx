import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '../../services/auth.service';
import { pointsService } from '../../services/points.service';
import { rewardsService, Reward } from '../../services/rewards.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function RewardDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const rewardId: string = route.params?.rewardId;
  const user = authService.getCurrentUser();
  const role: 'student' | 'teacher' = user?.role === 'pro' ? 'teacher' : 'student';

  const [reward, setReward] = useState<Reward | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user || !rewardId) return;
    let mounted = true;
    (async () => {
      const [list, b] = await Promise.all([
        rewardsService.listCatalog(role),
        pointsService.getBalance(user.id),
      ]);
      if (!mounted) return;
      setReward(list.find((r) => r.id === rewardId) ?? null);
      setBalance(b?.totalPoints ?? 0);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id, rewardId, role]);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirm = async (msg: string): Promise<boolean> => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.confirm(msg);
    }
    return new Promise((resolve) => {
      Alert.alert('Confirmation', msg, [
        { text: 'Annuler', onPress: () => resolve(false), style: 'cancel' },
        { text: 'Confirmer', onPress: () => resolve(true) },
      ]);
    });
  };

  const handleRedeem = async () => {
    if (!user || !reward) return;
    const ok = await confirm(
      `Échanger ${reward.costPoints.toLocaleString('fr-FR')} pts contre « ${reward.title} » ?\n\nCette action est irréversible.`
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      await rewardsService.redeem(user.id, reward.id);
      // Refresh balance
      const b = await pointsService.getBalance(user.id);
      setBalance(b?.totalPoints ?? 0);
      setDone(true);
      notify(
        '🎉 Demande enregistrée',
        "Tes points ont été déduits. On revient vers toi très vite pour finaliser l'envoi."
      );
    } catch (e: any) {
      notify('Échange impossible', e?.message ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.dim}>Chargement…</Text>
      </View>
    );
  }

  if (!reward) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.dim}>Récompense introuvable.</Text>
      </View>
    );
  }

  const canAfford = balance >= reward.costPoints;
  const missing = Math.max(0, reward.costPoints - balance);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
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
          {reward.badge && (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{reward.badge}</Text>
            </View>
          )}
          <Text style={styles.heroTitle}>{reward.title}</Text>
          {reward.shortDescription && (
            <Text style={styles.heroSub}>{reward.shortDescription}</Text>
          )}
          <Text style={styles.heroCost}>
            {reward.costPoints.toLocaleString('fr-FR')}{' '}
            <Text style={styles.heroCostUnit}>pts</Text>
          </Text>
          {reward.euroValue !== null && (
            <Text style={styles.heroEuro}>
              Valeur : {reward.euroValue.toFixed(2).replace('.', ',')} €
            </Text>
          )}
        </LinearGradient>

        {reward.description && (
          <Card style={styles.block}>
            <Text style={styles.sectionTitle}>Détails</Text>
            <Text style={styles.desc}>{reward.description}</Text>
          </Card>
        )}

        <Card style={styles.block}>
          <Text style={styles.sectionTitle}>Ton solde</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Solde actuel</Text>
            <Text style={styles.balanceValue}>
              {balance.toLocaleString('fr-FR')} pts
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Coût</Text>
            <Text style={styles.balanceValue}>
              −{reward.costPoints.toLocaleString('fr-FR')} pts
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabelBold}>
              {canAfford ? 'Après échange' : 'Il te manque'}
            </Text>
            <Text
              style={[
                styles.balanceValueBold,
                { color: canAfford ? colors.success : colors.error },
              ]}
            >
              {canAfford
                ? `${(balance - reward.costPoints).toLocaleString('fr-FR')} pts`
                : `${missing.toLocaleString('fr-FR')} pts`}
            </Text>
          </View>
        </Card>

        {!canAfford && (
          <View style={styles.helper}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textLight} />
            <Text style={styles.helperText}>
              Continue à utiliser Koureo (cours, parrainages…) pour gagner les points
              restants.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottom}>
        {done ? (
          <Button
            label="Retour à la boutique"
            variant={role === 'teacher' ? 'pro' : 'primary'}
            onPress={() => navigation.goBack()}
          />
        ) : (
          <Button
            label={
              canAfford ? 'Échanger mes points' : 'Solde insuffisant'
            }
            variant={role === 'teacher' ? 'pro' : 'primary'}
            onPress={handleRedeem}
            loading={submitting}
            disabled={!canAfford || submitting}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  dim: { color: colors.textLight, fontSize: 13 },
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
    alignItems: 'flex-start',
    ...shadows.card,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: spacing.md,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.md,
  },
  heroCost: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroCostUnit: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  heroEuro: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  block: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  balanceLabel: { fontSize: 13, color: colors.textSecondary },
  balanceLabelBold: { fontSize: 14, fontWeight: '700', color: colors.text },
  balanceValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  balanceValueBold: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },

  helper: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  helperText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
