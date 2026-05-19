import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { calendarService } from '../../services/calendar.service';
import { coursesService } from '../../services/courses.service';
import { teachersService } from '../../services/teachers.service';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function CalendarSyncScreen() {
  const navigation = useNavigation();
  const teacherId = useCurrentTeacherId();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Hydrate from AsyncStorage on mount, then re-check whenever teacherId
  // resolves (it's async on first render).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await calendarService.hydrate();
      if (!cancelled && teacherId) {
        setConnected(!!calendarService.getConnectionFor(teacherId));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  const handleConnect = async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      await calendarService.connect(teacherId);
      setConnected(true);
      // Try a first sync immediately so the user sees the value
      await runSync(true);
      Alert.alert(
        'Calendrier connecté ✓',
        'Tes événements personnels seront pris en compte pour éviter les conflits, et tes sessions Koureo apparaîtront dans ton calendrier.',
      );
    } catch (e: any) {
      Alert.alert('Connexion impossible', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (!teacherId) return;
    const conn = calendarService.getConnectionFor(teacherId);
    if (!conn) return;
    Alert.alert(
      'Déconnecter le calendrier ?',
      "Les événements déjà créés dans ton calendrier seront conservés. Tu pourras les supprimer depuis l'app Calendrier si tu veux.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await calendarService.disconnect(conn.id);
            setConnected(false);
            setLastSync(null);
          },
        },
      ],
    );
  };

  const runSync = async (silent = false) => {
    if (!teacherId) return;
    setSyncing(true);
    try {
      const classes = teachersService
        ? coursesService.listForTeacher(teacherId)
        : [];
      const classMap = new Map(classes.map((c) => [c.id, c]));
      // All future sessions for this teacher
      const allSessions = coursesService
        .allSessions()
        .filter((s) => classMap.has(s.classId))
        .filter((s) => new Date(s.startsAt).getTime() > Date.now())
        .filter((s) => s.status !== 'cancelled');
      const payload = allSessions.map((s) => {
        const cls = classMap.get(s.classId)!;
        return {
          id: s.id,
          title: cls.title,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
        };
      });
      const summary = await calendarService.syncSessionsToCalendar(teacherId, payload);
      setLastSync(new Date().toISOString());
      if (!silent) {
        Alert.alert(
          'Synchronisation terminée',
          `${summary.created} ajoutés · ${summary.updated} mis à jour${
            summary.skipped > 0 ? ` · ${summary.skipped} ignorés` : ''
          }.`,
        );
      }
    } catch (e: any) {
      if (!silent) Alert.alert('Erreur', e?.message ?? String(e));
    } finally {
      setSyncing(false);
    }
  };

  const platformSupported = Platform.OS === 'ios';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Synchronisation agenda</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <Card style={styles.intro}>
          <Text style={styles.introIcon}>📅</Text>
          <Text style={styles.introTitle}>Connecte ton calendrier iPhone</Text>
          <Text style={styles.introText}>
            Koureo lit tes événements occupés pour ne proposer aux élèves que des créneaux réellement disponibles. En plus, chaque session Koureo est ajoutée à un calendrier "Koureo — Mes cours" dans ton app Calendrier.
          </Text>
        </Card>

        {!platformSupported && (
          <Card style={styles.providerCard}>
            <Text style={styles.providerName}>Bientôt disponible sur Android</Text>
            <Text style={styles.providerHint}>
              La synchro calendrier passe par EventKit (iOS). Une version Android arrivera avec Google Calendar OAuth.
            </Text>
          </Card>
        )}

        <Card style={styles.providerCard}>
          <View style={styles.providerRow}>
            <View style={styles.providerIcon}>
              <Text style={styles.providerIconText}>📆</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName}>Calendrier iPhone</Text>
              {connected ? (
                <Badge label="Connecté" variant="success" small style={{ marginTop: 4 }} />
              ) : (
                <Text style={styles.providerHint}>
                  Inclut Apple Calendar, Google synchronisé via iOS, Exchange…
                </Text>
              )}
            </View>
            {connected ? (
              <TouchableOpacity onPress={handleDisconnect}>
                <Text style={styles.disconnect}>Déconnecter</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {!connected ? (
            <Button
              label={loading ? 'Connexion…' : 'Connecter mon calendrier'}
              variant="pro"
              loading={loading}
              onPress={handleConnect}
              style={{ marginTop: spacing.md }}
              disabled={!platformSupported || !teacherId}
            />
          ) : (
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={syncing ? 'Synchronisation…' : 'Synchroniser mes sessions maintenant'}
                variant="pro"
                loading={syncing}
                onPress={() => runSync(false)}
              />
              {lastSync && (
                <Text style={styles.lastSync}>
                  Dernière synchro : {new Date(lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment ça marche ?</Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoBullet}>•</Text> Tes événements personnels ne sont jamais visibles par les élèves — Koureo lit uniquement leur horaire pour bloquer les conflits.
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoBullet}>•</Text> Les sessions Koureo apparaissent dans un calendrier dédié <Text style={styles.infoBold}>"Koureo — Mes cours"</Text> que tu peux masquer ou supprimer à tout moment dans l'app Calendrier.
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoBullet}>•</Text> Si tu utilises Google Calendar ou Outlook, synchronise d'abord ton compte dans Réglages &gt; Calendrier &gt; Comptes — Koureo lira automatiquement les événements remontés sur iOS.
          </Text>
        </Card>
      </ScrollView>
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
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  back: { fontSize: 22, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  intro: { marginBottom: spacing.md, alignItems: 'center' },
  introIcon: { fontSize: 48, marginBottom: spacing.sm },
  introTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  introText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  providerCard: { marginBottom: spacing.md },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  providerIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  providerIconText: { fontSize: 22 },
  providerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  providerHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  disconnect: { fontSize: 13, fontWeight: '700', color: colors.error },
  lastSync: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: spacing.sm },
  infoCard: { marginBottom: spacing.md },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  infoLine: { fontSize: 12, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.xs },
  infoBullet: { color: colors.primary, fontWeight: '800' },
  infoBold: { fontWeight: '700', color: colors.text },
});
