import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../theme/theme';

interface CapacityBarProps {
  booked: number;
  max: number;
  label?: string;
}

export default function CapacityBar({ booked, max, label }: CapacityBarProps) {
  const ratio = Math.min(1, booked / max);
  const spotsLeft = Math.max(0, max - booked);
  const isAlmostFull = ratio >= 0.75;
  const isFull = booked >= max;

  const barColor = isFull
    ? colors.error
    : isAlmostFull
      ? colors.warning
      : colors.success;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label ?? 'Places'}</Text>
        <Text style={[styles.spotsLeft, { color: barColor }]}>
          {isFull ? 'Complet' : `${booked} / ${max} inscrit${booked > 1 ? 's' : ''}`}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spotsLeft: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
