import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getTeacherById } from '../../data/mockTeachers';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';

export default function StripeAccountScreen() {
  const navigation = useNavigation();
  const teacher = getTeacherById(DEMO_TEACHER_ID);
  const [connected, setConnected] = useState(!!teacher?.stripeAccountId);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setConnected(true);
      Alert.alert(
        'Compte Stripe connecté ✓',
        'Tu peux maintenant recevoir les paiements de tes cours. Le premier versement arrive 24h après le premier cours réalisé.'
      );
    }, 1000);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Déconnecter Stripe ?',
      'Tu ne pourras plus recevoir de paiements tant qu\'un compte n\'est pas reconnecté.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: () => setConnected(false),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compte Stripe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={connected ? ['#635BFF', '#7A73FF'] : [colors.surface, colors.surfaceWarm]}
          style={styles.hero}
        >
          <Text style={[styles.heroBrand, connected && { color: '#FFFFFF' }]}>stripe</Text>
          <Text style={[styles.heroTitle, connected && { color: '#FFFFFF' }]}>
            {connected ? 'Compte connecté' : 'Recevoir mes paiements'}
          </Text>
          {connected && (
            <Text style={styles.heroAccount}>
              Compte •••• {teacher?.stripeAccountId?.slice(-4) ?? '0000'}
            </Text>
          )}
          {connected && (
            <Badge label="Actif" variant="success" style={{ marginTop: spacing.sm }} />
          )}
        </LinearGradient>

        {/* Info */}
        <Card style={styles.block}>
          <Text style={styles.blockTitle}>Comment ça marche ?</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
            <Text style={styles.stepText}>Tu connectes ton compte bancaire via Stripe.</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
            <Text style={styles.stepText}>Les paiements des participants sont sécurisés sur Koureo.</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
            <Text style={styles.stepText}>24h après chaque cours, 88% te sont reversés automatiquement.</Text>
          </View>
        </Card>

        {/* Security */}
        <Card style={{ ...styles.block, ...styles.securityCard }}>
          <Text style={styles.securityIcon}>◆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Sécurité bancaire</Text>
            <Text style={styles.securityText}>
              Stripe est certifié PCI DSS niveau 1. Koureo ne stocke jamais tes coordonnées bancaires.
            </Text>
          </View>
        </Card>

        {connected && (
          <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
            <Text style={styles.disconnectText}>Déconnecter Stripe</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!connected && (
        <View style={styles.bottom}>
          <Button
            label={loading ? 'Connexion…' : 'Connecter mon compte Stripe'}
            variant="pro"
            loading={loading}
            onPress={handleConnect}
          />
        </View>
      )}
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  hero: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroBrand: {
    fontSize: 28,
    fontWeight: '700',
    color: '#635BFF',
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  heroAccount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  block: { marginBottom: spacing.md },
  blockTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.proAccent },
  stepText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  securityCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  securityIcon: { fontSize: 16, color: colors.proAccent, fontWeight: '700' },
  securityTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  securityText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  disconnectBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.md },
  disconnectText: { fontSize: 14, fontWeight: '600', color: colors.error },
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
