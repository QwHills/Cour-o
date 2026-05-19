import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { ADMIN_MENU, ADMIN_GROUP_LABELS, AdminMenuItem } from '../navigation/adminMenu';
import { adminColors } from '../theme/adminTheme';

const SIDEBAR_WIDTH = 240;

export default function AdminSidebar() {
  const navigation = useNavigation<any>();
  const currentRoute = useNavigationState((state) => {
    const r = state?.routes?.[state.index];
    return r?.name as string | undefined;
  });

  const grouped = groupMenu(ADMIN_MENU);

  return (
    <View style={styles.sidebar}>
      <View style={styles.brandRow}>
        <View style={styles.brandDot}>
          <Text style={styles.brandDotText}>K</Text>
        </View>
        <View>
          <Text style={styles.brandName}>Koureo</Text>
          <Text style={styles.brandSub}>Admin</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {(Object.keys(grouped) as Array<keyof typeof ADMIN_GROUP_LABELS>).map((g) => (
          <View key={g} style={styles.section}>
            <Text style={styles.sectionLabel}>{ADMIN_GROUP_LABELS[g]}</Text>
            {grouped[g].map((item) => {
              const active = currentRoute === item.route;
              const disabled = !item.enabled;
              return (
                <TouchableOpacity
                  key={item.route}
                  disabled={disabled}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(item.route)}
                  style={[
                    styles.item,
                    active ? styles.itemActive : null,
                    disabled ? styles.itemDisabled : null,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={
                      disabled
                        ? '#475569'
                        : active
                        ? adminColors.sidebarTextActive
                        : adminColors.sidebarText
                    }
                  />
                  <Text
                    style={[
                      styles.itemLabel,
                      active ? styles.itemLabelActive : null,
                      disabled ? styles.itemLabelDisabled : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {disabled ? <Text style={styles.soon}>bientôt</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function groupMenu(items: AdminMenuItem[]) {
  return items.reduce<Record<string, AdminMenuItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});
}

export const ADMIN_SIDEBAR_WIDTH = SIDEBAR_WIDTH;

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: adminColors.sidebarBg,
    paddingVertical: 20,
    paddingHorizontal: 12,
    ...(({ height: '100vh' as any }) as object),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.sidebarBgHover,
  },
  brandDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDotText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  brandSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    marginVertical: 1,
  },
  itemActive: {
    backgroundColor: adminColors.sidebarBgHover,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLabel: {
    color: adminColors.sidebarText,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  itemLabelActive: {
    color: adminColors.sidebarTextActive,
    fontWeight: '600',
  },
  itemLabelDisabled: {
    color: '#64748B',
  },
  soon: {
    fontSize: 9,
    color: '#64748B',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
