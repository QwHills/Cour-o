// Signup flow for a structure / studio / school / association / club.
// Creates BOTH the admin user account and the organization row in one step.
// The creator is auto-added as org admin and lands on OrgDashboardScreen.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { organizationsService } from '../../services/organizations.service';
import { OrganizationKind } from '../../types/domain';

const KINDS: { value: OrganizationKind; label: string; icon: string }[] = [
  { value: 'studio_yoga',     label: 'Studio yoga',       icon: '🧘' },
  { value: 'sport_club',      label: 'Salle de sport',    icon: '💪' },
  { value: 'dance_school',    label: 'École de danse',    icon: '💃' },
  { value: 'music_school',    label: 'École de musique',  icon: '🎵' },
  { value: 'wellness_center', label: 'Bien-être',         icon: '🌿' },
  { value: 'association',     label: 'Association',       icon: '🤝' },
  { value: 'other',           label: 'Autre',             icon: '✨' },
];

export default function OrgSignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Step state — we keep the UI on a single screen but highlight the two
  // sections (admin account vs structure) for clarity.
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [acceptCGU, setAcceptCGU] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [orgKind, setOrgKind] = useState<OrganizationKind | ''>('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');

  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!adminName || !adminEmail || !adminPassword) {
      Alert.alert('Compte admin incomplet', 'Remplis ton prénom, email et mot de passe.');
      return;
    }
    if (!orgName || !orgKind) {
      Alert.alert('Structure incomplète', 'Indique au moins le nom et le type de ta structure.');
      return;
    }
    if (!acceptCGU) {
      Alert.alert('', "Tu dois accepter les conditions d'utilisation.");
      return;
    }

    setLoading(true);
    try {
      // Step 1 — create the admin user as a "pro" role (grants access to
      // org-management screens). The user will also be the creator of the
      // organization, then auto-promoted to admin via organizationsService.
      const user = await authService.signUp(adminName, adminEmail, adminPassword, 'pro');

      // Step 2 — create the organization; the service auto-inserts the
      // creator as an 'admin' member so RLS clears on subsequent writes.
      await organizationsService.create({
        name: orgName,
        kind: orgKind as OrganizationKind,
        description: orgDescription || undefined,
        address: orgAddress || undefined,
        phone: orgPhone || undefined,
        email: adminEmail,
        createdBy: user.id,
      });

      // Root navigator detects the new org admin membership on auth change
      // and routes to OrgTabs automatically.
    } catch (e: any) {
      Alert.alert('Création impossible', e.message ?? 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une structure</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <Text style={styles.intro}>
          Tu gères un studio, une école, un club ? Crée ta page Koureo et invite
          tes professeurs. Les élèves pourront acheter des abonnements à ta
          structure et réserver des créneaux chez n'importe lequel de tes profs.
        </Text>

        <Text style={styles.sectionTitle}>1. Ton compte admin</Text>
        <Text style={styles.sectionHint}>
          Tu seras admin de la structure. Tu pourras ajouter d'autres admins
          plus tard.
        </Text>
        <Input
          label="Prénom"
          placeholder="Comment t'appelles-tu ?"
          value={adminName}
          onChangeText={setAdminName}
          autoCapitalize="words"
        />
        <Input
          label="Email"
          placeholder="ton@email.com"
          value={adminEmail}
          onChangeText={setAdminEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Mot de passe"
          placeholder="6 caractères minimum"
          value={adminPassword}
          onChangeText={setAdminPassword}
          secureTextEntry
        />

        <Text style={styles.sectionTitle}>2. Ta structure</Text>

        <Input
          label="Nom de la structure *"
          placeholder="Ex: Labo Yoga Rennes"
          value={orgName}
          onChangeText={setOrgName}
        />

        <Text style={styles.miniLabel}>Type d'établissement *</Text>
        <View style={styles.chipRow}>
          {KINDS.map((k) => (
            <TouchableOpacity
              key={k.value}
              style={[styles.chip, orgKind === k.value && styles.chipActive]}
              onPress={() => setOrgKind(k.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipIcon}>{k.icon}</Text>
              <Text style={[styles.chipText, orgKind === k.value && styles.chipTextActive]}>
                {k.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Description"
          placeholder="Décris ta structure en quelques mots…"
          value={orgDescription}
          onChangeText={setOrgDescription}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80 }}
        />

        <Input
          label="Adresse"
          placeholder="8 Place de la République, Rennes"
          value={orgAddress}
          onChangeText={setOrgAddress}
        />

        <Input
          label="Téléphone"
          placeholder="06 12 34 56 78"
          value={orgPhone}
          onChangeText={setOrgPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={styles.cguRow}
          onPress={() => setAcceptCGU(!acceptCGU)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, acceptCGU && styles.checkboxActive]}>
            {acceptCGU && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.cguText}>
            J'accepte les{' '}
            <Text
              style={styles.cguLink}
              onPress={() => navigation.navigate('CGU')}
            >
              conditions d'utilisation
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={loading ? 'Création…' : 'Créer ma structure'}
          variant="pro"
          loading={loading}
          onPress={handleCreate}
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
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  back: { fontSize: 22, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  intro: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  miniLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.proAccent, borderColor: colors.proAccent },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  cguRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.proAccent, borderColor: colors.proAccent },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cguText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  cguLink: { color: colors.primary, textDecorationLine: 'underline', fontWeight: '600' },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
