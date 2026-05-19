import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { adminColors, adminRadii } from '../theme/adminTheme';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

const palette: Record<StatusTone, { bg: string; fg: string }> = {
  success: { bg: adminColors.successLight, fg: adminColors.success },
  warning: { bg: adminColors.warningLight, fg: adminColors.warning },
  error: { bg: adminColors.errorLight, fg: adminColors.error },
  info: { bg: adminColors.infoLight, fg: adminColors.info },
  neutral: { bg: '#F1F5F9', fg: '#475569' },
  primary: { bg: '#ecfbf7', fg: adminColors.primary },
};

export default function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const { bg, fg } = palette[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: adminRadii.pill,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
