import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, shadows, spacing } from '../../theme/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'pro' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  fullWidth = true,
  icon,
  style,
}: ButtonProps) {
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const paddingVertical = size === 'lg' ? 18 : 14;
  const containerStyle: ViewStyle = {
    borderRadius: radii.xl,
    ...(fullWidth ? { alignSelf: 'stretch' } : {}),
    ...(variant === 'primary' ? shadows.button : {}),
    ...(variant === 'pro' ? shadows.buttonPro : {}),
    opacity: disabled ? 0.45 : 1,
    ...style,
  };

  if (isGhost) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[styles.ghost, { paddingVertical }, containerStyle]}
      >
        <Text style={styles.ghostLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  if (isSecondary) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[styles.secondary, { paddingVertical }, containerStyle]}
      >
        <Text style={styles.secondaryLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  const gradientColors: [string, string] =
    variant === 'pro'
      ? [colors.proGradientStart, colors.proGradientEnd]
      : [colors.gradientStart, colors.gradientEnd];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={containerStyle}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { paddingVertical }]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.row}>
            {icon ? <Text style={styles.icon}>{icon}</Text> : null}
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: { fontSize: 18 },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ghost: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
  },
  ghostLabel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
