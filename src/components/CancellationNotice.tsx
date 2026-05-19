import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/theme';

interface Props {
  hoursBefore: number;
  refundPercent?: number;
}

export default function CancellationNotice({ hoursBefore, refundPercent = 100 }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.icon}>ℹ️</Text>
      <View style={styles.content}>
        <Text style={styles.title}>Politique d'annulation</Text>
        <Text style={styles.text}>
          Annulation gratuite jusqu'à {hoursBefore}h avant le cours
          {refundPercent === 100 ? ' (remboursement intégral)' : ` (${refundPercent}% remboursés)`}.
          Au-delà, aucun remboursement possible.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 18,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.info,
    marginBottom: 2,
  },
  text: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
