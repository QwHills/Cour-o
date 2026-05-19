import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { adminColors, adminRadii, adminSpacing, adminShadows, adminTypography } from '../theme/adminTheme';

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function StatCard({ label, value, delta, hint, icon }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={adminTypography.cardTitle}>{label}</Text>
        {icon ? <Ionicons name={icon} size={16} color={adminColors.textLight} /> : null}
      </View>
      <Text style={[adminTypography.metric, { marginTop: 8 }]}>{value}</Text>
      <View style={styles.footerRow}>
        {delta ? (
          <Text
            style={[
              styles.delta,
              { color: delta.positive ? adminColors.success : adminColors.error },
            ]}
          >
            {delta.positive ? '▲' : '▼'} {delta.value}
          </Text>
        ) : null}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.card,
    borderRadius: adminRadii.card,
    padding: adminSpacing.lg,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    flex: 1,
    minWidth: 160,
    ...adminShadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: adminSpacing.sm,
    marginTop: adminSpacing.xs,
  },
  delta: {
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: adminColors.textLight,
  },
});
