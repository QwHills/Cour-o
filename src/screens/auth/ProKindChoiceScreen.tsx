// 3-way fork that appears after "Je donne des cours" on the Welcome screen.
// Steers the pro signup toward the right onboarding flow:
//   1. solo independent teacher (existing ProSignUp → ProOnboarding1..3)
//   2. running a studio / school / association (new OrgSignUp)
//   3. joining an existing structure (waits for an admin invite)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radii, shadows } from '../../theme/theme';

export default function ProKindChoiceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={{ width: 24 }} />
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>KOUREO</Text>
        <Text style={styles.title}>Comment veux-tu{'\n'}utiliser Koureo ?</Text>
        <Text style={styles.subtitle}>
          Choisis l'option qui te correspond — tu pourras la faire évoluer
          plus tard.
        </Text>

        <ChoiceCard
          icon="person-outline"
          tint={colors.primary}
          bg="#ecfbf7"
          title="En solo"
          subtitle="Je suis prof indépendant, je propose mes propres cours."
          hint="Validation après 3 cours gratuits avec note ≥ 4/5"
          onPress={() => navigation.navigate('ProSignUp')}
        />

        <ChoiceCard
          icon="business-outline"
          tint="#7EB5A6"
          bg="#EEF5F2"
          title="Je gère une structure"
          subtitle="Studio, école, salle, club, association… avec plusieurs professeurs."
          hint="Création d'une page structure + gestion des profs et abonnements"
          onPress={() => navigation.navigate('OrgSignUp')}
        />

        <ChoiceCard
          icon="people-outline"
          tint="#C9A96E"
          bg="#F8F0DC"
          title="Je rejoins une structure"
          subtitle="J'ai reçu une invitation d'un studio ou d'une école."
          hint="L'admin de ta structure doit d'abord t'inviter par email"
          onPress={() => navigation.navigate('ProSignUp', { pendingInvite: true })}
        />
      </ScrollView>
    </View>
  );
}

function ChoiceCard({
  icon,
  tint,
  bg,
  title,
  subtitle,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  title: string;
  subtitle: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={26} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <Text style={styles.cardHint}>{hint}</Text>
      </View>
      <Text style={styles.cardArrow}>›</Text>
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brand: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  cardHint: { fontSize: 11, color: colors.textLight, marginTop: 6, lineHeight: 15, fontStyle: 'italic' },
  cardArrow: { fontSize: 26, color: colors.textLight, fontWeight: '300' },
});
