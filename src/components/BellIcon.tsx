import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { notificationsService } from '../services/notifications.service';
import { authService } from '../services/auth.service';
import { colors, shadows } from '../theme/theme';

interface Props {
  onDark?: boolean;
  target?: string; // navigation screen name, default 'Notifications'
}

export default function BellIcon({ onDark = false, target = 'Notifications' }: Props) {
  const navigation = useNavigation<any>();
  const user = authService.getCurrentUser();
  const [unread, setUnread] = useState(
    user ? notificationsService.countUnread(user.id) : 0
  );

  useEffect(() => {
    return notificationsService.onChange(() => {
      if (user) setUnread(notificationsService.countUnread(user.id));
    });
  }, [user]);

  return (
    <TouchableOpacity
      style={[styles.btn, onDark ? styles.btnDark : styles.btnLight]}
      activeOpacity={0.8}
      onPress={() => {
        // Try to navigate from parent or current navigator
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Profil', { screen: target });
        } else {
          navigation.navigate(target);
        }
      }}
    >
      <Ionicons
        name={unread > 0 ? 'notifications' : 'notifications-outline'}
        size={22}
        color={onDark ? '#FFFFFF' : colors.text}
      />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unread > 9 ? '9+' : String(unread)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnLight: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  btnDark: {
    backgroundColor: 'rgba(26,23,20,0.45)',
  },
  icon: {
    fontSize: 20,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
