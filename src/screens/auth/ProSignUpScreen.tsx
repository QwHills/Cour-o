import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../../theme/theme';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';

export default function ProSignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptCGU, setAcceptCGU] = useState(false);

  // Loose email regex — catches obvious typos without rejecting valid edge
  // cases (sub-domains, '+' aliases, etc.). Supabase will run a stricter
  // RFC-grade check server-side anyway.
  const emailLooksValid = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleNext = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail || !password) {
      Alert.alert('Champs manquants', 'Remplis tous les champs pour continuer.');
      return;
    }
    if (cleanName.length < 2) {
      Alert.alert('Prénom trop court', 'Entre au moins 2 caractères.');
      return;
    }
    if (!emailLooksValid(cleanEmail)) {
      Alert.alert('Email invalide', 'Vérifie le format de ton adresse email.');
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        'Mot de passe trop court',
        'Choisis un mot de passe d\'au moins 6 caractères pour protéger ton compte.',
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(
        'Les mots de passe ne correspondent pas',
        'Vérifie que tu as saisi le même mot de passe dans les deux champs.',
      );
      return;
    }
    if (!acceptCGU) {
      Alert.alert(
        'CGU non acceptées',
        "Tu dois accepter les conditions d'utilisation pour continuer.",
      );
      return;
    }
    // Account creation is deferred to step 4 so the user can back out without
    // leaving an orphan auth row behind.
    navigation.navigate('ProOnboarding1', {
      name: cleanName,
      email: cleanEmail,
      password,
    });
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
        <Text style={styles.step}>Étape 1/4</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.brand}>KOUREO</Text>
        <Text style={styles.title}>Crée ton compte{'\n'}professeur</Text>
        <Text style={styles.subtitle}>
          Quelques infos pour démarrer. Tu pourras tout modifier ensuite.
        </Text>

        <View style={styles.form}>
          <Input
            label="Prénom"
            placeholder="Comment t'appelles-tu ?"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Input
            label="Email"
            placeholder="ton@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <PasswordInput
            label="Mot de passe"
            placeholder="6 caractères minimum"
            value={password}
            onChangeText={setPassword}
          />
          <PasswordInput
            label="Confirme ton mot de passe"
            placeholder="Re-tape le même mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={
              confirmPassword.length > 0 && confirmPassword !== password
                ? 'Les mots de passe ne correspondent pas'
                : undefined
            }
          />
        </View>

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

        <Button
          label="Continuer"
          onPress={handleNext}
          disabled={!acceptCGU}
        />

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>
            Déjà un compte ? <Text style={styles.loginBold}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  brand: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textLight,
    letterSpacing: 6,
    marginBottom: spacing.lg,
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
  form: {
    marginBottom: spacing.lg,
  },
  cguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cguText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  cguLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
