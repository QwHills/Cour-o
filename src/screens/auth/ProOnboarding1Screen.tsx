import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Button from '../../components/ui/Button';
import { TeacherKind } from '../../types/domain';

export default function ProOnboarding1Screen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { name, email, password, isUpgrade } = route.params ?? {};
  const [selected, setSelected] = useState<TeacherKind | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.step}>Étape 2/4</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Quel type de{'\n'}professeur es-tu ?
        </Text>
        <Text style={styles.subtitle}>
          Cela détermine comment tu démarreras sur Koureo.
        </Text>

        {/* Particulier card */}
        <TouchableOpacity
          style={[styles.typeCard, selected === 'particulier' && styles.typeCardActive]}
          onPress={() => setSelected('particulier')}
          activeOpacity={0.9}
        >
          <Text style={styles.typeEmoji}>🌱</Text>
          <Text style={styles.typeTitle}>Particulier</Text>
          <Text style={styles.typeDescription}>
            Je partage ma passion. Je débute ou je souhaite donner des cours ponctuellement.
          </Text>
          <View style={styles.typeInfoBox}>
            <Text style={styles.typeInfoTitle}>Comment ça marche ?</Text>
            <Text style={styles.typeInfoText}>
              Tu commences par proposer <Text style={styles.bold}>3 cours gratuits</Text>.
              Les participants t'évaluent. Avec une note ≥ 4/5,
              tu deviens <Text style={styles.bold}>Certifié</Text> et peux proposer des cours payants.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Professionnel card */}
        <TouchableOpacity
          style={[styles.typeCard, selected === 'professional' && styles.typeCardActive]}
          onPress={() => setSelected('professional')}
          activeOpacity={0.9}
        >
          <Text style={styles.typeEmoji}>🏢</Text>
          <Text style={styles.typeTitle}>Professionnel</Text>
          <Text style={styles.typeDescription}>
            J'ai une structure, un studio, une école ou une association. Je donne des cours régulièrement.
          </Text>
          <View style={styles.typeInfoBox}>
            <Text style={styles.typeInfoTitle}>Avantages</Text>
            <Text style={styles.typeInfoText}>
              Accès immédiat aux <Text style={styles.bold}>cours payants</Text>, synchronisation
              agenda, gestion avancée des créneaux et des paiements.
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label="Continuer"
          onPress={() => navigation.navigate('ProOnboarding2', { name, email, password, kind: selected, isUpgrade })}
          disabled={!selected}
        />
      </View>
    </View>
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
  step: { fontSize: 12, fontWeight: '600', color: colors.textLight, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 36,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  typeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFAF7',
  },
  typeEmoji: {
    fontSize: 36,
    marginBottom: spacing.md,
  },
  typeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  typeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  typeInfoBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  typeInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  typeInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
