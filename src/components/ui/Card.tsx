import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing | 'none';
  elevated?: boolean;
}

export default function Card({
  children,
  style,
  padding = 'md',
  elevated = true,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && shadows.card,
        padding !== 'none' && { padding: spacing[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
  },
});
