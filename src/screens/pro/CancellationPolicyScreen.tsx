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

type Policy = 'strict' | 'standard' | 'flexible';

const OPTIONS: { value: Policy; label: string; desc: string; recommended?: boolean }[] = [
  {
    value: 'flexible',
    label: 'Flexible',
    desc: 'Annulation gratuite jusqu\'à 24h avant le cours. Remboursement 100%.',
  },
  {
    value: 'standard',
    label: 'Standard',
    desc: 'Annulation gratuite jusqu\'à 48h avant. Remboursement 100%.',
    recommended: true,
  },
  {
    value: 'strict',
    label: 'Stricte',
    desc: 'Annulation gratuite jusqu\'à 7 jours avant. Sinon 50% remboursés.',
  },
];

export default function CancellationPolicyScreen() {
  const navigation = useNavigation();
  const [policy, setPolicy] = useState<Policy>('standard');

  const handleSave = () => {
    Alert.alert('Politique enregistrée ✓', '', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politique d'annulation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choisis ta politique</Text>
        <Text style={styles.subtitle}>
          Une politique flexible rassure les participants et favorise les réservations. Une politique stricte te protège des annulations de dernière minute.
        </Text>

        {OPTIONS.map((opt) => {
          const active = policy === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionCard, active && styles.optionCardActive]}
              onPress={() => setPolicy(opt.value)}
              activeOpacity={0.9}
            >
              <View style={styles.optionTop}>
                <Text style={[styles.optionLabel, active && { color: colors.proAccent }]}>
                  {opt.label}
                </Text>
                {opt.recommended && (
                  <View style={styles.recoBadge}>
                    <Text style={styles.recoText}>Recommandé</Text>
                  </View>
                )}
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          );
        })}

        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>◆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Cette politique s'applique à toutes tes offres</Text>
            <Text style={styles.infoText}>
              Les participants la voient avant de réserver et lors de la confirmation.
            </Text>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.bottom}>
        <Button label="Enregistrer" variant="pro" onPress={handleSave} />
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
  },
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  optionCardActive: {
    borderColor: colors.proAccent,
    backgroundColor: '#F9F7FD',
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  optionLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  recoBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  recoText: { fontSize: 10, fontWeight: '700', color: colors.success },
  radio: {
    marginLeft: 'auto',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: colors.proAccent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.proAccent },
  optionDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginTop: spacing.md,
  },
  infoIcon: { fontSize: 16, color: colors.proAccent, fontWeight: '700' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  infoText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
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
