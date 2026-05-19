import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { formatCommissionLabel } from '../../services/commission.service';
import { useCommission } from '../../hooks/useCommission';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';

export default function CommissionInfoScreen() {
  const navigation = useNavigation();
  // Live binding to the active commission row in DB — re-renders if it
  // changes (e.g. after the boot loader resolves or an admin updates).
  const commission = useCommission();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commission plateforme</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.proGradientStart, colors.proGradientEnd]}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>Commission Koureo</Text>
          <Text style={styles.heroValue}>{formatCommissionLabel(commission)}</Text>
          <Text style={styles.heroHint}>par réservation payante</Text>
        </LinearGradient>

        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Répartition</Text>
          <View style={styles.splitBar}>
            <View style={styles.splitPro}>
              <Text style={styles.splitProText}>88% pour toi</Text>
            </View>
            <View style={styles.splitPlatform}>
              <Text style={styles.splitPlatformText}>12%</Text>
            </View>
          </View>
          <Text style={styles.blockText}>
            Sur chaque réservation payante, tu perçois 88% du montant net. Les 12% restants financent la plateforme.
          </Text>
        </Card>

        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Exemples concrets</Text>
          <Example price={10} />
          <Example price={20} />
          <Example price={50} />
        </Card>

        <Card style={styles.block}>
          <Text style={styles.blockTitle}>À quoi sert la commission ?</Text>
          <Item icon="◆" label="Frais de traitement bancaire (Stripe)" />
          <Item icon="◆" label="Modération et support participants / profs" />
          <Item icon="◆" label="Visibilité de ton profil dans l'app" />
          <Item icon="◆" label="Développement continu de la plateforme" />
        </Card>

        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Pas de commission sur les cours gratuits</Text>
          <Text style={styles.blockText}>
            Pendant ta phase d'évaluation, tu proposes des cours gratuits. Aucune commission n'est prélevée.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

function Example({ price }: { price: number }) {
  const commission = (price * 12) / 100;
  const net = price - commission;
  return (
    <View style={styles.exampleRow}>
      <Text style={styles.examplePrice}>{price}€</Text>
      <Text style={styles.exampleArrow}>→</Text>
      <Text style={styles.exampleNet}>{net.toFixed(2)}€ net</Text>
      <Text style={styles.exampleCommission}>(− {commission.toFixed(2)}€)</Text>
    </View>
  );
}

function Item({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={styles.itemLabel}>{label}</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  hero: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', letterSpacing: 0.5 },
  heroValue: { fontSize: 52, color: '#FFFFFF', fontWeight: '800', letterSpacing: -1, marginVertical: spacing.xs },
  heroHint: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  block: { marginBottom: spacing.md },
  blockTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  blockText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  splitBar: {
    flexDirection: 'row',
    height: 36,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  splitPro: {
    flex: 88,
    backgroundColor: colors.proAccent,
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  splitProText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  splitPlatform: {
    flex: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitPlatformText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },

  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  examplePrice: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 40 },
  exampleArrow: { fontSize: 16, color: colors.textLight },
  exampleNet: { fontSize: 15, fontWeight: '700', color: colors.success, flex: 1 },
  exampleCommission: { fontSize: 12, color: colors.textLight },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  itemIcon: { fontSize: 14, color: colors.proAccent, fontWeight: '700' },
  itemLabel: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
