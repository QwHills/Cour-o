import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import {
  notificationsService,
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
} from '../../services/notifications.service';
import { AppNotification } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const user = authService.getCurrentUser();
  const [notifications, setNotifications] = useState<AppNotification[]>(
    user ? notificationsService.listForUser(user.id) : []
  );

  useEffect(() => {
    return notificationsService.onChange(() => {
      if (user) setNotifications(notificationsService.listForUser(user.id));
    });
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    if (user) notificationsService.markAllAsRead(user.id);
  };

  const handleTapNotification = (n: AppNotification) => {
    notificationsService.markAsRead(n.id);
    // In production, navigate to the action screen
    if (n.action) {
      Alert.alert(n.title, `Navigation vers : ${n.action.screen}`);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Tout effacer ?',
      'Toutes les notifications seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            notifications.forEach((n) => notificationsService.delete(n.id));
          },
        },
      ]
    );
  };

  // Group notifications by day
  const grouped: { label: string; items: AppNotification[] }[] = [];
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  for (const n of notifications) {
    const d = new Date(n.createdAt).toDateString();
    const label =
      d === today ? "Aujourd'hui" : d === yesterdayStr ? 'Hier' : 'Plus ancien';
    const group = grouped.find((g) => g.label === label);
    if (group) {
      group.items.push(n);
    } else {
      grouped.push({ label, items: [n] });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={unreadCount > 0 ? handleMarkAllRead : handleClearAll}>
            <Text style={styles.headerAction}>
              {unreadCount > 0 ? 'Tout lire' : 'Effacer'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Tout est à jour</Text>
          <Text style={styles.emptyText}>
            Tu recevras ici les rappels de tes cours, les messages de tes
            profs et les nouveautés autour de toi.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onPress={() => handleTapNotification(n)}
                />
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const iconColor = getNotificationColor(notification.type, colors);
  const icon = getNotificationIcon(notification.type);

  return (
    <TouchableOpacity
      style={[styles.row, !notification.read && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, !notification.read && styles.titleUnread]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={styles.time}>
            {formatNotificationTime(notification.createdAt)}
          </Text>
        </View>
        <Text
          style={[styles.body, !notification.read && styles.bodyUnread]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
      </View>
      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  headerAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },

  group: { marginBottom: spacing.lg },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  rowUnread: {
    backgroundColor: colors.surfaceWarm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  titleUnread: {
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    color: colors.textLight,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bodyUnread: {
    color: colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 56,
    color: colors.textLight,
    marginBottom: spacing.md,
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
