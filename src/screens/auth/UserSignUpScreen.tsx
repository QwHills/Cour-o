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
import { authService } from '../../services/auth.service';
import { colors, spacing, radii } from '../../theme/theme';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';

export default function UserSignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailLooksValid = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleCreate = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail || !password) {
      Alert.alert('Champs manquants', 'Remplis tous les champs pour continuer.');
      return;
    }
    if (!emailLooksValid(cleanEmail)) {
      Alert.alert('Email invalide', 'Vérifie le format de ton adresse email.');
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        'Mot de passe trop court',
        "Choisis un mot de passe d'au moins 6 caractères.",
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
    setLoading(true);
    try {
      await authService.signUp(cleanName, cleanEmail, password, 'user');
      // RootNavigator detects role='user' → shows UserTabs
    } catch (e: any) {
      const raw = e?.message ?? 'Une erreur est survenue';
      const msg = raw.includes('already registered')
        ? 'Cet email a déjà un compte. Connecte-toi ou utilise un autre email.'
        : raw;
      Alert.alert('Erreur', msg);
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
      </View>

      <View style={styles.content}>
        <Text style={styles.brand}>KOUREO</Text>
        <Text style={styles.title}>Crée ton compte</Text>
        <Text style={styles.subtitle}>
          Découvre et réserve des cours passionnants autour de toi.
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

        {/* CGU checkbox */}
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
          label="Créer mon compte"
          onPress={handleCreate}
          loading={loading}
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
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
  },
  back: { fontSize: 24, color: colors.text },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
