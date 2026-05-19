import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme/theme';

interface SessionSlotProps {
  dateLabel: string;
  timeLabel: string;
  spotsLeft: number;
  maxSpots: number;
  selected: boolean;
  full?: boolean;
  onPress: () => void;
}

export default function SessionSlot({
  dateLabel,
  timeLabel,
  spotsLeft,
  maxSpots,
  selected,
  full,
  onPress,
}: SessionSlotProps) {
  const disabled = !!full;
  const isGroup = maxSpots > 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.slot,
        selected && styles.slotSelected,
        disabled && styles.slotDisabled,
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.date,
            selected && styles.dateSelected,
            disabled && styles.textDisabled,
          ]}
        >
          {dateLabel}
        </Text>
      </View>
      <Text
        style={[
          styles.time,
          selected && styles.timeSelected,
          disabled && styles.textDisabled,
        ]}
      >
        {timeLabel}
      </Text>
      {isGroup && (
        <Text
          style={[
            styles.spots,
            selected && styles.spotsSelected,
            disabled && styles.textDisabled,
          ]}
        >
          {disabled ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}`}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  slot: {
    minWidth: 100,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.sm,
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.button,
  },
  slotDisabled: {
    backgroundColor: colors.borderLight,
    borderColor: colors.border,
    opacity: 0.6,
  },
  header: {
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  time: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  timeSelected: {
    color: '#FFFFFF',
  },
  spots: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  spotsSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  textDisabled: {
    color: colors.textLight,
  },
});
