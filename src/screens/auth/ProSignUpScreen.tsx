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
import Button from '../../components/ui/Button';

export default function ProSignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptCGU, setAcceptCGU] = useState(false);

  const handleNext = () => {
    if (!name || !email || !password) {
      Alert.alert('', 'Remplis tous les champs pour continuer.');
      return;
    }
    if (!acceptCGU) {
      Alert.alert('', "Tu dois accepter les conditions d'utilisation.");
      return;
    }
    // Don't create user yet — pass data forward, create at final step
    navigation.navigate('ProOnboarding1', { name, email, password });
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
          <Input
            label="Mot de passe"
            placeholder="6 caractères minimum"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
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
