import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/theme';

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'pro' | 'gold';

interface BadgeProps {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
  small?: boolean;
}

const palette: Record<Variant, { bg: string; fg: string }> = {
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning },
  error: { bg: colors.errorLight, fg: colors.error },
  info: { bg: colors.infoLight, fg: colors.info },
  neutral: { bg: colors.surface, fg: colors.textSecondary },
  primary: { bg: '#ecfbf7', fg: colors.primary },
  pro: { bg: '#EEEBF7', fg: colors.proAccent },
  gold: { bg: '#F8F0DC', fg: colors.accent },
};

export default function Badge({ label, variant = 'neutral', style, small }: BadgeProps) {
  const { bg, fg } = palette[variant];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: small ? spacing.sm + 2 : spacing.md,
          paddingVertical: small ? 4 : spacing.xs + 2,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: fg, fontSize: small ? 10 : 11 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
