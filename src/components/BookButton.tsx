import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows } from '../theme/theme';

interface BookButtonProps {
  price: number;
  onPress: () => void;
  spotsLeft: number;
}

export default function BookButton({ price, onPress, spotsLeft }: BookButtonProps) {
  return (
    <View style={styles.container}>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{price}€</Text>
        <Text style={styles.perSession}> / séance</Text>
      </View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.buttonWrapper}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Réserver</Text>
          {spotsLeft <= 3 && (
            <Text style={styles.urgency}>Plus que {spotsLeft} place{spotsLeft > 1 ? 's' : ''} !</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  perSession: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  buttonWrapper: {
    ...shadows.button,
    borderRadius: borderRadius.xl,
  },
  button: {
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  urgency: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
