import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import { teachersService } from '../../services/teachers.service';
import { geocodeAddress } from '../../utils/geocode';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function ProOnboarding3Screen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const {
    name: userName,
    email,
    password,
    kind,
    bio,
    categories,
    photoUrl: photoFromStep3,
    isUpgrade,
  } = route.params;

  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbisUploaded, setKbisUploaded] = useState(false);
  const [siret, setSiret] = useState('');

  const handlePublish = async () => {
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      Alert.alert('Adresse manquante', "Entre l'adresse où tu donnes tes cours.");
      return;
    }

    setLoading(true);
    try {
      // 1. Geocode the address up front so a typo / unknown street doesn't
      //    leave the new prof stuck on the Rennes default position.
      const geo = await geocodeAddress(cleanAddress);
      if (!geo.resolved) {
        // Soft-warn; we still let them through with the Rennes fallback so
        // signup never blocks. They can fix the position later from the web.
        console.warn('[onboarding3] geocoding fallback for', cleanAddress);
      }

      // 2. Create-or-promote the auth account.
      let userId: string;
      if (isUpgrade) {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) throw new Error('Session expirée, reconnecte-toi.');
        userId = currentUser.id;
        await authService.upgradeToPro();
      } else {
        if (!email || !password) throw new Error('Email ou mot de passe manquant.');
        const user = await authService.signUp(userName, email, password, 'pro');
        userId = user.id;
      }

      // 3. Create the teacher profile with the geocoded coords + the photo
      //    chosen at step 3 (fallback to a generic avatar if the prof skipped
      //    the photo step — they can change it any time from Réglages).
      await teachersService.createTeacher({
        userId,
        kind,
        displayName: userName,
        bio: bio || '',
        photoUrl:
          photoFromStep3 ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
        categories,
        address: cleanAddress,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });

      // 4. Success feedback — RootNavigator will swap to ProTabs once the
      //    auth state propagates, but a confirmation pops anxiety down.
      const successMsg = geo.resolved
        ? 'Bienvenue sur Koureo ! Ton profil est en ligne.'
        : "Bienvenue sur Koureo ! On n'a pas trouvé l'adresse exactement — tu peux corriger la position depuis Réglages.";
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(successMsg);
      } else {
        Alert.alert('Profil créé ✓', successMsg);
      }
    } catch (e: any) {
      console.error('[onboarding3] failed:', e);
      const raw = e?.message ?? 'Une erreur est survenue';
      // Friendlier copy for the most common Supabase errors.
      const msg = raw.includes('already registered')
        ? 'Cet email a déjà un compte. Connecte-toi ou utilise un autre email.'
        : raw.includes('Password')
          ? 'Le mot de passe doit faire au moins 6 caractères.'
          : raw;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Erreur : ' + msg);
      } else {
        Alert.alert('Erreur', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const isParticulier = kind === 'particulier';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.step}>Étape 4/4</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Dernière étape !</Text>
        <Text style={styles.subtitle}>
          Où donnes-tu tes cours ? Les participants te trouveront sur la carte.
        </Text>

        <Input
          label="Adresse"
          placeholder="15 Rue de la Monnaie, Rennes"
          value={address}
          onChangeText={setAddress}
        />

        {/* Kbis upload — only for professionals */}
        {!isParticulier && (
          <View style={styles.kbisSection}>
            <Text style={styles.kbisSectionTitle}>Justificatif professionnel</Text>
            <Text style={styles.kbisSectionHint}>
              Pour valider ton statut professionnel, nous avons besoin de ton Kbis ou d'un justificatif équivalent.
            </Text>

            <Input
              label="Numéro SIRET"
              placeholder="123 456 789 00012"
              value={siret}
              onChangeText={setSiret}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.kbisUpload, kbisUploaded && styles.kbisUploadDone]}
              onPress={() => setKbisUploaded(true)}
              activeOpacity={0.8}
            >
              {kbisUploaded ? (
                <>
                  <Text style={styles.kbisCheckIcon}>✓</Text>
                  <View>
                    <Text style={styles.kbisUploadedTitle}>Kbis ajouté</Text>
                    <Text style={styles.kbisUploadedFile}>kbis_2024.pdf</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.kbisIcon}>📄</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kbisUploadTitle}>Ajouter ton Kbis</Text>
                    <Text style={styles.kbisUploadHint}>PDF ou photo · Moins de 3 mois</Text>
                  </View>
                  <Text style={styles.kbisArrow}>+</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.kbisNote}>
              <Text style={styles.kbisNoteIcon}>🔒</Text>
              <Text style={styles.kbisNoteText}>
                Ton Kbis est traité de manière confidentielle et sera vérifié sous 24-48h.
              </Text>
            </View>
          </View>
        )}

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récap de ton profil</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nom</Text>
            <Text style={styles.summaryValue}>{userName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Type</Text>
            <Text style={styles.summaryValue}>
              {isParticulier ? 'Particulier' : 'Professionnel'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Catégories</Text>
            <Text style={styles.summaryValue}>{categories.join(', ')}</Text>
          </View>
          {bio ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bio</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>
                {bio}
              </Text>
            </View>
          ) : null}
        </View>

        {isParticulier ? (
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.infoCard}
          >
            <Text style={styles.infoEmoji}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Prochaine étape</Text>
              <Text style={styles.infoText}>
                Tu commenceras par proposer 3 cours gratuits. Les participants t'évalueront.
                Avec une note ≥ 4/5, tu seras certifié et pourras fixer tes prix !
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={[colors.proGradientStart, colors.proGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.infoCard}
          >
            <Text style={styles.infoEmoji}>🏢</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Vérification en cours</Text>
              <Text style={styles.infoText}>
                Ton Kbis sera vérifié sous 24-48h. Tu pourras commencer à configurer tes cours en attendant la validation.
              </Text>
            </View>
          </LinearGradient>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={isParticulier ? 'Lancer mon activité ✨' : 'Soumettre mon profil'}
          onPress={handlePublish}
          loading={loading}
          disabled={!address || (!isParticulier && (!kbisUploaded || !siret))}
        />
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 140,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  kbisSection: {
    marginBottom: spacing.lg,
  },
  kbisSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  kbisSectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  kbisUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kbisUploadDone: {
    borderColor: colors.success,
    borderStyle: 'solid',
    backgroundColor: colors.successLight,
  },
  kbisIcon: { fontSize: 28 },
  kbisUploadTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  kbisUploadHint: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  kbisArrow: { fontSize: 24, fontWeight: '300', color: colors.textLight },
  kbisCheckIcon: { fontSize: 24, fontWeight: '800', color: colors.success },
  kbisUploadedTitle: { fontSize: 15, fontWeight: '600', color: colors.success },
  kbisUploadedFile: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  kbisNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  kbisNoteIcon: { fontSize: 14 },
  kbisNoteText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, flex: 1 },
  infoCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: radii.lg,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  infoEmoji: { fontSize: 28 },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
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
