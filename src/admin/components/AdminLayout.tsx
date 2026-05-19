import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { adminColors, adminSpacing } from '../theme/adminTheme';

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export default function AdminLayout({ title, subtitle, rightAction, children }: AdminLayoutProps) {
  return (
    <View style={styles.shell}>
      <AdminSidebar />
      <View style={styles.main}>
        <AdminTopbar title={title} subtitle={subtitle} rightAction={rightAction} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: adminColors.pageBg,
    minHeight: '100vh' as any,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: adminSpacing.xl,
    gap: adminSpacing.xl,
  },
});
