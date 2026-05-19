import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AdminLayout from '../components/AdminLayout';
import { adminColors } from '../theme/adminTheme';

// Placeholder partagé pour les modules V1 non encore implémentés (sera remplacé
// module par module en Phase 1). Évite de dupliquer 8 fichiers presque vides.

interface AdminPlaceholderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description: string;
}

export default function AdminPlaceholder({ title, subtitle, icon = 'construct-outline', description }: AdminPlaceholderProps) {
  return (
    <AdminLayout title={title} subtitle={subtitle}>
      <View style={styles.empty}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={32} color={adminColors.primary} />
        </View>
        <Text style={styles.title}>Module en cours d'implémentation</Text>
        <Text style={styles.desc}>{description}</Text>
        <Text style={styles.tag}>PHASE 1</Text>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    paddingVertical: 64,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfbf7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: adminColors.text,
    marginBottom: 8,
  },
  desc: {
    fontSize: 13,
    color: adminColors.textSecondary,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  tag: {
    marginTop: 20,
    fontSize: 10,
    fontWeight: '700',
    color: adminColors.primary,
    letterSpacing: 1.5,
    backgroundColor: '#ecfbf7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
