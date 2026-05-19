import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { VatRegime } from '../types/domain';
import { colors, spacing, radii, shadows } from '../theme/theme';

interface Props {
  value: VatRegime;
  onChange: (regime: VatRegime) => void;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

const OPTIONS: { value: VatRegime; label: string; desc: string; icon: IoniconName }[] = [
  {
    value: 'non_assujetti',
    label: 'Non assujetti',
    desc: 'Auto-entrepreneur (< 36 800€/an). Pas de TVA collectée.',
    icon: 'home-outline',
  },
  {
    value: 'tva_20',
    label: 'TVA 20%',
    desc: 'Entreprise collectant la TVA. Factures avec TVA détaillée.',
    icon: 'business-outline',
  },
  {
    value: 'exonere_formation',
    label: 'Exonéré formation',
    desc: 'Organisme de formation agréé. Exonération TVA art. 261.',
    icon: 'school-outline',
  },
];

export default function VatRegimeSelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.85}
          >
            <Ionicons name={opt.icon} size={24} color={active ? colors.proAccent : colors.textSecondary} style={styles.icon} />
            <View style={styles.info}>
              <Text style={[styles.label, active && styles.labelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.desc}>{opt.desc}</Text>
            </View>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  },
  optionActive: {
    borderColor: colors.proAccent,
    backgroundColor: '#F9F7FD',
  },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  labelActive: { color: colors.proAccent },
  desc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: colors.proAccent },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.proAccent,
  },
});
