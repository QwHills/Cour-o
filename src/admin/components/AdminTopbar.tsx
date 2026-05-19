import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '../../services/auth.service';
import { adminColors, adminSpacing, adminRadii } from '../theme/adminTheme';

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export default function AdminTopbar({ title, subtitle, rightAction }: AdminTopbarProps) {
  const user = authService.getCurrentUser();
  return (
    <View style={styles.bar}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={15} color={adminColors.textLight} />
        <TextInput
          placeholder="Recherche globale…"
          placeholderTextColor={adminColors.textLight}
          style={styles.searchInput}
        />
        <Text style={styles.searchKbd}>⌘K</Text>
      </View>

      {rightAction}

      <View style={styles.userRow}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(user?.name ?? '?')[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View>
          <Text style={styles.userName}>{user?.name ?? 'Admin'}</Text>
          <Text style={styles.userRole}>Administrateur</Text>
        </View>
        <TouchableOpacity onPress={() => authService.signOut()} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color={adminColors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: adminSpacing.lg,
    paddingHorizontal: adminSpacing.xl,
    paddingVertical: adminSpacing.lg,
    backgroundColor: adminColors.card,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.tableBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: adminColors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: adminColors.textLight,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: adminSpacing.md,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderRadius: adminRadii.button,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    width: 280,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: adminColors.text,
    outlineWidth: 0,
  } as any,
  searchKbd: {
    fontSize: 11,
    color: adminColors.textLight,
    fontWeight: '600',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: adminSpacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: adminColors.tableBorder,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    backgroundColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: adminColors.text,
  },
  userRole: {
    fontSize: 11,
    color: adminColors.textLight,
    fontWeight: '500',
    marginTop: 1,
  },
  logoutBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
