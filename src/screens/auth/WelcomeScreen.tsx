import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Button from '../../components/ui/Button';
import { authService } from '../../services/auth.service';

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleExplore = () => {
    navigation.navigate('UserSignUp');
  };

  return (
    <View style={styles.container}>
      {/* Hero background — photo full-screen avec fondu sur toute la hauteur (Option C) */}
      <ImageBackground
        source={require('../../../assets/hero-welcome.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.25)',
            'rgba(0,0,0,0.1)',
            'rgba(248,251,250,0)',
            'rgba(248,251,250,0.5)',
            'rgba(248,251,250,0.92)',
            '#f8fbfa',
          ]}
          locations={[0, 0.2, 0.5, 0.7, 0.85, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Title overlay sur la photo */}
        <View style={styles.heroOverImage}>
          <Text style={styles.brandOnImage}>KOUREO</Text>
          <Text style={styles.heroTitleWhite}>
            Trouvez une activité{'\n'}proche de vous.
          </Text>
        </View>
      </ImageBackground>

      {/* Content bas — sur fond blanc */}
      <View style={styles.content}>

        <View style={styles.actions}>
          <Button
            label="Je cherche un cours"
            onPress={handleExplore}
          />

          <View style={{ height: spacing.sm }} />

          <Button
            label="Je donne des cours"
            variant="secondary"
            onPress={() => navigation.navigate('ProKindChoice')}
          />
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginText}>
            J'ai déjà un compte · <Text style={styles.loginBold}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topGradient: {
    height: '65%',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  brand: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textLight,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  // Bloc titre sur la photo — descendu pour respirer au-dessus des boutons
  heroOverImage: {
    position: 'absolute',
    top: '52%',
    left: spacing.xl,
    right: spacing.xl,
  },
  brandOnImage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroTitleWhite: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 44,
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroBlock: {
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 24,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
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
