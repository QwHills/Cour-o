// "Mes abonnements" — lists every wallet the student has across all the
// teachers and organizations they've purchased from, with remaining credits
// and recent purchase history. Entry point from UserProfileScreen.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { creditsService } from '../../services/credits.service';
import { productsService } from '../../services/products.service';
import { teachersService } from '../../services/teachers.service';
import { organizationsService } from '../../services/organizations.service';
import {
  CreditWallet,
  OwnerType,
  ProductKind,
  StudentPurchase,
} from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function MySubscriptionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [, setTick] = useState(0);
  useEffect(() => creditsService.onChange(() => setTick((t) => t + 1)), []);

  const user = authService.getCurrentUser();
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Connecte-toi pour voir tes abonnements.</Text>
      </View>
    );
  }

  const wallets = creditsService.listWalletsForUser(user.id);
  const purchases = creditsService.listPurchasesForUser(user.id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes abonnements</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {wallets.length === 0 && purchases.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Aucun abonnement pour l'instant</Text>
            <Text style={styles.emptyText}>
              Achète un pack ou un abonnement chez un prof ou une structure
              pour commencer à accumuler des crédits.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.getParent()?.navigate('Explorer')}
              activeOpacity={0.9}
            >
              <Text style={styles.exploreBtnText}>Explorer les cours</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {wallets.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Crédits actifs · {wallets.length}</Text>
                {wallets.map((w) => (
                  <WalletRow key={w.id} wallet={w} />
                ))}
              </View>
            )}

            {purchases.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Historique d'achats · {purchases.length}</Text>
                {purchases.map((p) => (
                  <PurchaseRow key={p.id} purchase={p} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function resolveOwnerName(ownerType: OwnerType, ownerId: string): string {
  if (ownerType === 'teacher') {
    return teachersService.getCached(ownerId)?.displayName ?? 'Professeur';
  }
  return organizationsService.getById(ownerId)?.name ?? 'Structure';
}

function WalletRow({ wallet }: { wallet: CreditWallet }) {
  const ownerName = useMemo(
    () => resolveOwnerName(wallet.ownerType, wallet.ownerId),
    [wallet.ownerType, wallet.ownerId],
  );
  return (
    <Card style={styles.walletCard}>
      <View style={styles.walletLeft}>
        <View
          style={[
            styles.walletAvatar,
            wallet.ownerType === 'organization' && { backgroundColor: '#EEF5F2' },
          ]}
        >
          <Text style={styles.walletAvatarText}>
            {wallet.ownerType === 'teacher' ? '🧑' : '🏢'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.walletOwner}>{ownerName}</Text>
          <Text style={styles.walletLabel}>
            {wallet.ownerType === 'teacher' ? 'Prof indépendant' : 'Structure'}
          </Text>
        </View>
      </View>
      <View style={styles.walletRight}>
        <Text style={styles.walletBalance}>{wallet.balance}</Text>
        <Text style={styles.walletUnit}>
          crédit{wallet.balance > 1 ? 's' : ''}
        </Text>
      </View>
    </Card>
  );
}

const KIND_LABEL: Record<ProductKind, string> = {
  single_class: "Cours à l'unité",
  credit_pack: 'Pack',
  monthly_subscription: 'Abonnement',
};

function PurchaseRow({ purchase }: { purchase: StudentPurchase }) {
  const product = productsService.getById(purchase.productId);
  const ownerName = useMemo(
    () => resolveOwnerName(purchase.ownerType, purchase.ownerId),
    [purchase.ownerType, purchase.ownerId],
  );
  const date = new Date(purchase.purchasedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const expired = purchase.expiresAt
    ? new Date(purchase.expiresAt).getTime() < Date.now()
    : false;

  return (
    <Card style={styles.purchaseCard}>
      <View style={{ flex: 1 }}>
        <View style={styles.purchaseTop}>
          {product && (
            <Badge label={KIND_LABEL[product.kind]} variant="neutral" small />
          )}
          {expired && <Badge label="Expiré" variant="error" small />}
          {purchase.autoRenew && !expired && (
            <Badge label="Renouvellement auto" variant="primary" small />
          )}
        </View>
        <Text style={styles.purchaseName}>
          {product?.name ?? 'Offre'}
        </Text>
        <Text style={styles.purchaseSub}>
          Chez {ownerName} · {date}
        </Text>
      </View>
      <Text style={styles.purchasePrice}>{purchase.amountPaid.toFixed(0)}€</Text>
    </Card>
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

  empty: { textAlign: 'center', marginTop: 80, color: colors.textLight },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  exploreBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    ...shadows.button,
  },
  exploreBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  walletAvatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#ecfbf7',
    alignItems: 'center', justifyContent: 'center',
  },
  walletAvatarText: { fontSize: 22 },
  walletOwner: { fontSize: 15, fontWeight: '700', color: colors.text },
  walletLabel: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  walletRight: { alignItems: 'center' },
  walletBalance: { fontSize: 24, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  walletUnit: { fontSize: 11, color: colors.textSecondary, marginTop: -2 },

  purchaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  purchaseTop: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  purchaseName: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6 },
  purchaseSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  purchasePrice: { fontSize: 15, fontWeight: '800', color: colors.text },
});
