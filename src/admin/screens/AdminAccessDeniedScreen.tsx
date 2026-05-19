import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AdminActionButton from '../components/AdminActionButton';
import { authService } from '../../services/auth.service';
import { adminColors } from '../theme/adminTheme';

// Affiché quand un utilisateur non-admin tape une URL /admin/* dans son
// navigateur. La RLS Supabase bloque déjà l'accès aux données ; ce screen
// gère l'UX côté front et offre un retour vers l'app standard.

export default function AdminAccessDeniedScreen({ reason }: { reason: 'not_admin' | 'not_logged' }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={32} color={adminColors.error} />
        </View>
        <Text style={styles.title}>Accès restreint</Text>
        <Text style={styles.subtitle}>
          {reason === 'not_logged'
            ? 'Cet espace est réservé aux administrateurs Koureo. Connectez-vous avec un compte admin pour continuer.'
            : 'Votre compte n\'a pas les droits administrateur. Si vous pensez que c\'est une erreur, contactez le propriétaire de la plateforme.'}
        </Text>
        <View style={{ height: 16 }} />
        <AdminActionButton
          label={reason === 'not_logged' ? 'Aller à la connexion' : 'Retour à l\'application'}
          onPress={() => {
            if (Platform.OS === 'web') {
              window.location.href = '/';
            }
          }}
          variant="primary"
        />
        {reason === 'not_admin' ? (
          <AdminActionButton
            label="Se déconnecter"
            onPress={() => {
              authService.signOut().then(() => {
                if (Platform.OS === 'web') window.location.href = '/';
              });
            }}
            variant="ghost"
            style={{ marginTop: 8 }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminColors.pageBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: '100vh' as any,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    maxWidth: 460,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: adminColors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: adminColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: adminColors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
});
