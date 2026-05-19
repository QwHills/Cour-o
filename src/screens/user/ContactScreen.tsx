import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const TOPICS = [
  'Problème avec une réservation',
  'Paiement / remboursement',
  'Signaler un comportement',
  'Question sur un cours',
  'Problème technique',
  'Autre',
];

export default function ContactScreen() {
  const navigation = useNavigation();
  const user = authService.getCurrentUser();
  const [topic, setTopic] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!topic) {
      Alert.alert('', 'Choisis un sujet avant d\'envoyer.');
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert('', 'Ton message doit faire au moins 10 caractères.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Message envoyé ✓',
        "L'équipe Koureo te répondra sous 24h à l'adresse " + (user?.email ?? 'de ton compte'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 600);
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
        <Text style={styles.headerTitle}>Nous contacter</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Besoin d'aide ?</Text>
        <Text style={styles.subtitle}>
          L'équipe Koureo te répond sous 24h à ton adresse email.
        </Text>

        <Text style={styles.label}>Sujet</Text>
        <View style={styles.topicGrid}>
          {TOPICS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.topicChip, topic === t && styles.topicChipActive]}
              onPress={() => setTopic(t)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.topicText, topic === t && styles.topicTextActive]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Ton message"
          placeholder="Décris ta demande en quelques mots…"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={{ minHeight: 140 }}
        />

        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>◆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Réponse sous 24h</Text>
            <Text style={styles.infoText}>
              Pour les questions fréquentes, consulte d'abord le centre d'aide.
            </Text>
          </View>
        </Card>

        <Text style={styles.emailInfo}>
          Tu peux aussi nous écrire directement à{' '}
          <Text style={styles.emailLink}>hello@koureo.fr</Text>
        </Text>
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={loading ? 'Envoi…' : 'Envoyer ma demande'}
          onPress={handleSend}
          loading={loading}
          disabled={!topic || message.trim().length < 10}
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 140 },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  topicChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  topicText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  topicTextActive: { color: '#FFFFFF', fontWeight: '600' },

  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  infoText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  emailInfo: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  emailLink: {
    fontWeight: '600',
    color: colors.primary,
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
