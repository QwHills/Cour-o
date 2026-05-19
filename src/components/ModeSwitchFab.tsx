// Floating action button to switch between pro and user modes.
// Only visible if the signed-in user has a teacher_profile (i.e. they're
// actually a pro who can toggle back and forth). For pure students, the
// component renders null so there's nothing to confuse them.
//
// Style: extended FAB (pill shape) with icon + label so the action is
// self-explanatory at a glance.

import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authService } from '../services/auth.service';
import { teachersService } from '../services/teachers.service';
import { colors, spacing, radii } from '../theme/theme';

interface Props {
  /** Override placement if the default conflicts with another floating UI */
  top?: number;
  bottom?: number;
  right?: number;
  left?: number;
}

export default function ModeSwitchFab({ top, bottom, right = 16, left }: Props) {
  // Default placement: top-right (in the space where the old "Rechercher
  // un cours" header button used to sit), unless an explicit `bottom` or
  // `left` is provided. Because the wrapper is `position: absolute`
  // OUTSIDE any ScrollView, the FAB stays fixed during scroll.
  const resolvedTop = bottom == null && top == null ? 60 : top;
  const [, setTick] = useState(0);
  useEffect(() => authService.onChange(() => setTick((t) => t + 1)), []);

  const user = authService.getCurrentUser();
  const [isExistingPro, setIsExistingPro] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsExistingPro(false);
      return;
    }
    let cancelled = false;
    teachersService.getByUserId(user.id).then((t) => {
      if (!cancelled) setIsExistingPro(!!t);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Hide for non-pros (students) — they have no second mode to switch to.
  if (!user || !isExistingPro) return null;

  const currentlyPro = user.role === 'pro';
  const targetRole: 'pro' | 'user' = currentlyPro ? 'user' : 'pro';
  const targetLabel = currentlyPro ? 'Mode élève' : 'Mode prof';
  // Gradient picks the destination role's brand color so the visual cue
  // tells the user "you're about to switch to *this* universe".
  const gradient: [string, string] = currentlyPro
    ? [colors.primary, '#A580E8'] // student / lavender
    : [colors.proGradientStart, colors.proGradientEnd];

  const handlePress = () => {
    const confirmTitle = 'Changement de mode';
    const confirmMessage = `Voulez-vous passer en ${targetLabel.toLowerCase()} ?`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(`${confirmTitle}\n\n${confirmMessage}`);
      if (ok) authService.switchRole(targetRole);
      return;
    }

    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Oui',
        style: 'default',
        onPress: () => authService.switchRole(targetRole),
      },
    ]);
  };

  return (
    <View
      style={[
        styles.wrapper,
        resolvedTop != null && { top: resolvedTop },
        bottom != null && { bottom },
        right != null && { right },
        left != null && { left },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityLabel={`Passer en ${targetLabel.toLowerCase()}`}
        accessibilityRole="button"
        style={styles.shadow}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pill}
        >
          <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
          <Text style={styles.label}>{targetLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  // Drop the shadow on the wrapper so the gradient can occupy the full pill
  // without antialiasing artefacts at the corners.
  shadow: {
    shadowColor: '#1A1714',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderRadius: radii.full,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.full,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
