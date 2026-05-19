import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { favoritesService } from '../services/favorites.service';
import { authService } from '../services/auth.service';
import { colors } from '../theme/theme';

interface Props {
  classId: string;
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean; // for overlay on images
  style?: ViewStyle;
}

export default function FavoriteButton({
  classId,
  size = 'md',
  onDark = false,
  style,
}: Props) {
  const user = authService.getCurrentUser();
  const [active, setActive] = useState(
    user ? favoritesService.isFavorite(user.id, classId) : false
  );
  const scale = useState(new Animated.Value(1))[0];

  useEffect(() => {
    return favoritesService.onChange(() => {
      if (user) setActive(favoritesService.isFavorite(user.id, classId));
    });
  }, [user, classId]);

  const handlePress = (e: any) => {
    e.stopPropagation?.();
    if (!user) return;
    favoritesService.toggle(user.id, classId);
    // Bounce animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const dims = { sm: 32, md: 40, lg: 48 }[size];
  const iconSize = { sm: 16, md: 20, lg: 24 }[size];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.btn,
        onDark && styles.btnOnDark,
        { width: dims, height: dims, borderRadius: dims / 2 },
        style,
      ]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.Text
        style={[
          styles.heart,
          {
            fontSize: iconSize,
            color: active ? colors.primary : onDark ? 'rgba(255,255,255,0.85)' : colors.textLight,
            transform: [{ scale }],
          },
        ]}
      >
        {active ? '♥' : '♡'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  btnOnDark: {
    backgroundColor: 'rgba(26,23,20,0.45)',
    shadowOpacity: 0,
  },
  heart: {
    fontWeight: '500',
  },
});
