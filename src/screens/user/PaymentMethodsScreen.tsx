import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

type CardBrand = 'visa' | 'mastercard' | 'amex';

interface PaymentCard {
  id: string;
  brand: CardBrand;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

const mockCards: PaymentCard[] = [
  { id: 'c1', brand: 'visa', last4: '4242', expiry: '12/27', isDefault: true },
  { id: 'c2', brand: 'mastercard', last4: '8201', expiry: '03/26', isDefault: false },
];

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const [cards, setCards] = useState<PaymentCard[]>(mockCards);

  const setDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  const removeCard = (id: string) => {
    Alert.alert('Supprimer la carte ?', 'Tu pourras l\'ajouter à nouveau plus tard.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setCards((prev) => prev.filter((c) => c.id !== id)),
      },
    ]);
  };

  const addCard = () => {
    Alert.alert(
      'Ajouter une carte',
      'En production, un formulaire sécurisé Stripe Elements s\'ouvrirait ici.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moyens de paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cards.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◇</Text>
            <Text style={styles.emptyTitle}>Aucune carte enregistrée</Text>
            <Text style={styles.emptyText}>
              Ajoute une carte pour réserver tes cours plus rapidement.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Cartes enregistrées</Text>
            {cards.map((c) => (
              <PaymentCardRow
                key={c.id}
                card={c}
                onSetDefault={() => setDefault(c.id)}
                onRemove={() => removeCard(c.id)}
              />
            ))}
          </>
        )}

        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>◆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Paiements sécurisés</Text>
            <Text style={styles.infoText}>
              Tes paiements sont traités par Stripe. Koureo ne stocke jamais tes données bancaires.
            </Text>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.bottom}>
        <Button label="Ajouter une carte" icon="+" onPress={addCard} />
      </View>
    </View>
  );
}

function PaymentCardRow({
  card,
  onSetDefault,
  onRemove,
}: {
  card: PaymentCard;
  onSetDefault: () => void;
  onRemove: () => void;
}) {
  const brandLabel = card.brand === 'visa' ? 'VISA' : card.brand === 'mastercard' ? 'Mastercard' : 'AmEx';
  const brandColor = card.brand === 'visa' ? '#1A1F71' : card.brand === 'mastercard' ? '#EB001B' : '#006FCF';

  return (
    <Card style={styles.cardRow}>
      <View style={[styles.brandBox, { backgroundColor: brandColor }]}>
        <Text style={styles.brandText}>{brandLabel}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardNumber}>•••• {card.last4}</Text>
          {card.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Par défaut</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardExpiry}>Expire {card.expiry}</Text>
      </View>
      <View style={styles.cardActions}>
        {!card.isDefault && (
          <TouchableOpacity onPress={onSetDefault}>
            <Text style={styles.actionText}>Par défaut</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRemove}>
          <Text style={styles.removeText}>Retirer</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  brandBox: {
    width: 52,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  defaultBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  cardExpiry: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  cardActions: { alignItems: 'flex-end', gap: 8 },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  removeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  infoText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 56,
    color: colors.textLight,
    marginBottom: spacing.md,
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
