// Checkout for a commercial product (subscription / credit pack / single
// class). Triggered from TeacherProfileScreen when the student taps an
// offer. Handles Stripe payment, records the purchase and grants credits
// to the student's wallet for this owner.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStripe } from '../../services/stripe/stripePlatform';
import { productsService } from '../../services/products.service';
import { creditsService } from '../../services/credits.service';
import { paymentsService } from '../../services/payments.service';
import { authService } from '../../services/auth.service';
import { organizationsService } from '../../services/organizations.service';
import { teachersService } from '../../services/teachers.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { ProductKind } from '../../types/domain';

const KIND_LABEL: Record<ProductKind, string> = {
  single_class: "Cours à l'unité",
  credit_pack: 'Pack de crédits',
  monthly_subscription: 'Abonnement mensuel',
};
const KIND_ICON: Record<ProductKind, string> = {
  single_class: '🎟️',
  credit_pack: '🎁',
  monthly_subscription: '💳',
};

export default function ProductCheckoutScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { productId } = route.params;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const product = productsService.getById(productId);
  const [loading, setLoading] = useState(false);

  // Seller display name (teacher or organization) for the receipt copy.
  const sellerName = useMemo(() => {
    if (!product) return '';
    if (product.ownerType === 'teacher') {
      return teachersService.getCached(product.ownerId)?.displayName ?? 'Professeur';
    }
    return organizationsService.getById(product.ownerId)?.name ?? 'Structure';
  }, [product]);

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Offre introuvable.</Text>
      </View>
    );
  }

  const unit = product.billingInterval === 'monthly' ? '/ mois' : '';
  const credits = product.creditsGranted ?? 0;
  const detailLine = product.kind === 'single_class'
    ? "Accès à 1 cours à l'unité"
    : product.kind === 'monthly_subscription'
      ? `${credits} crédits renouvelés automatiquement chaque mois`
      : `${credits} crédits · valables ${product.validityDays ?? 90} jours`;

  const handlePay = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Stripe PaymentSheet
      const sheet = await paymentsService.createPaymentSheet({
        amount: product.price,
        currency: 'eur',
        bookingReference: `product_${product.id}`,
      });
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Koureo',
        paymentIntentClientSecret: sheet.paymentIntentClientSecret,
        customerId: sheet.customerId,
        customerEphemeralKeySecret: sheet.ephemeralKeySecret,
        defaultBillingDetails: { email: user.email, name: user.name },
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);
      const { error: sheetError } = await presentPaymentSheet();
      if (sheetError) {
        if (sheetError.code !== 'Canceled') throw new Error(sheetError.message);
        return;
      }

      // Record purchase + grant credits
      const purchase = await creditsService.recordPurchase({
        userId: user.id,
        productId: product.id,
        owner: { type: product.ownerType, id: product.ownerId },
        amountPaid: product.price,
        validityDays: product.validityDays,
        autoRenew: product.billingInterval === 'monthly',
      });

      const credits = product.creditsGranted ?? (product.kind === 'single_class' ? 1 : 0);
      if (credits > 0) {
        await creditsService.grantFromPurchase({
          userId: user.id,
          owner: { type: product.ownerType, id: product.ownerId },
          credits,
          purchaseId: purchase.id,
        });
      }

      Alert.alert(
        'Achat confirmé ! 🎉',
        `${credits} crédit${credits > 1 ? 's' : ''} ajouté${credits > 1 ? 's' : ''} à ton compte chez ${sellerName}. Tu peux maintenant réserver tes créneaux.`,
      );
      setTimeout(() => navigation.goBack(), 400);
    } catch (e: any) {
      Alert.alert('Paiement échoué', e.message ?? 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <Card style={styles.block}>
          <Text style={styles.sellerLabel}>Chez</Text>
          <Text style={styles.sellerName}>{sellerName}</Text>
        </Card>

        <Card style={styles.block}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerIcon}>{KIND_ICON[product.kind]}</Text>
            <View style={{ flex: 1 }}>
              <Badge label={KIND_LABEL[product.kind]} variant="primary" small />
              <Text style={styles.offerName}>{product.name}</Text>
            </View>
          </View>
          {product.description !== '' && (
            <Text style={styles.offerDescription}>{product.description}</Text>
          )}
          <View style={styles.offerDivider} />
          <View style={styles.offerPriceRow}>
            <Text style={styles.offerDetail}>{detailLine}</Text>
            <View style={styles.priceBox}>
              <Text style={styles.offerPrice}>{product.price.toFixed(2)}€</Text>
              {unit !== '' && <Text style={styles.offerUnit}>{unit}</Text>}
            </View>
          </View>
        </Card>

        <Card style={styles.block}>
          <Text style={styles.sectionTitle}>Méthode de paiement</Text>
          <View style={styles.paymentRow}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>💳</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Carte Visa •••• 4242</Text>
              <Text style={styles.cardHint}>Paiement sécurisé via Stripe</Text>
            </View>
          </View>
        </Card>

        {product.billingInterval === 'monthly' && (
          <View style={styles.recurNote}>
            <Text style={styles.recurNoteText}>
              Abonnement mensuel — prélevé automatiquement à la date
              anniversaire du mois suivant (28, 30 ou 31 jours selon le mois).
              Tu peux l'arrêter depuis ton profil à tout moment.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={
            loading
              ? 'Paiement en cours…'
              : `Payer ${product.price.toFixed(2)}€${unit ? ` ${unit}` : ''}`
          }
          onPress={handlePay}
          loading={loading}
        />
      </View>
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
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  back: { fontSize: 22, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  error: { fontSize: 14, color: colors.error, textAlign: 'center', marginTop: 80 },
  block: { marginBottom: spacing.md },

  sellerLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  sellerName: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },

  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  offerIcon: { fontSize: 32 },
  offerName: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 4 },
  offerDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.md },
  offerDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  offerPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerDetail: { fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  priceBox: { alignItems: 'flex-end' },
  offerPrice: { fontSize: 24, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  offerUnit: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: -2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: { fontSize: 20 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  recurNote: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  recurNoteText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
