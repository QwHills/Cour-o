import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { adminColors, adminRadii, adminSpacing, adminShadows, adminTypography } from '../theme/adminTheme';

// Wrapper carte autour d'un graphique. Le rendu effectif des charts vient de
// recharts (web-only). Sur natif on affiche un placeholder — l'admin est
// volontairement web-only mais on garde le composant cross-platform pour ne
// pas casser le bundle iOS/Android.

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  rightAction?: React.ReactNode;
  height?: number;
  style?: ViewStyle;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  rightAction,
  height = 260,
  style,
}: ChartCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={adminTypography.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {rightAction}
      </View>
      <View style={[styles.chartArea, { height }]}>
        {Platform.OS === 'web' ? (
          children
        ) : (
          <Text style={styles.fallback}>Graphiques disponibles sur la version web.</Text>
        )}
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
    minWidth: 300,
    ...adminShadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: adminSpacing.md,
  },
  subtitle: {
    fontSize: 12,
    color: adminColors.textLight,
    marginTop: 2,
  },
  chartArea: {
    width: '100%',
  },
  fallback: {
    color: adminColors.textLight,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
