import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { adminColors, adminRadii, adminSpacing } from '../theme/adminTheme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AdminActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function AdminActionButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'md',
  loading,
  disabled,
  style,
}: AdminActionButtonProps) {
  const s = stylesFor(variant);
  const pad = size === 'sm'
    ? { paddingVertical: 6, paddingHorizontal: 12 }
    : { paddingVertical: 10, paddingHorizontal: 16 };
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.base, s.bg, pad, disabled ? { opacity: 0.5 } : null, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={s.fg.color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 14 : 16} color={s.fg.color} style={{ marginRight: 6 }} /> : null}
          <Text style={[styles.label, s.fg, size === 'sm' ? { fontSize: 12 } : null]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: adminRadii.button,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

function stylesFor(v: Variant) {
  switch (v) {
    case 'primary':
      return {
        bg: { backgroundColor: adminColors.primary, borderWidth: 0 },
        fg: { color: '#FFFFFF' },
      };
    case 'secondary':
      return {
        bg: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: adminColors.tableBorder },
        fg: { color: adminColors.text },
      };
    case 'ghost':
      return {
        bg: { backgroundColor: 'transparent', borderWidth: 0 },
        fg: { color: adminColors.primary },
      };
    case 'danger':
      return {
        bg: { backgroundColor: adminColors.errorLight, borderWidth: 1, borderColor: adminColors.error },
        fg: { color: adminColors.error },
      };
  }
}
