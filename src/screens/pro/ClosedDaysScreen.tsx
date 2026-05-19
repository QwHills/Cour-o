import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { availabilityService } from '../../services/availability.service';
import { ClosedPeriod } from '../../types/domain';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';

export default function ClosedDaysScreen() {
  const navigation = useNavigation();
  const [periods, setPeriods] = useState<ClosedPeriod[]>(
    () => availabilityService.getClosedPeriods(DEMO_TEACHER_ID),
  );

  const addPeriod = () => {
    Alert.alert(
      'Nouvelle période',
      "En production, un sélecteur de dates s'ouvrirait ici.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ajouter mock',
          onPress: () => {
            const newPeriod: ClosedPeriod = {
              id: `p${Date.now()}`,
              label: 'Nouvelle absence',
              start: '2026-05-01',
              end: '2026-05-05',
            };
            availabilityService.addClosedPeriod(DEMO_TEACHER_ID, newPeriod);
            setPeriods((prev) => [...prev, newPeriod]);
          },
        },
      ]
    );
  };

  const removePeriod = (id: string) => {
    Alert.alert('Supprimer cette période ?', '', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          availabilityService.removeClosedPeriod(DEMO_TEACHER_ID, id);
          setPeriods((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jours de fermeture</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Périodes d'absence</Text>
        <Text style={styles.subtitle}>
          Bloque automatiquement les réservations pendant tes vacances ou absences.
        </Text>

        {periods.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyIcon}>◇</Text>
            <Text style={styles.emptyText}>
              Aucune période enregistrée. Ajoute tes vacances pour bloquer les réservations.
            </Text>
          </Card>
        ) : (
          periods.map((p) => (
            <Card key={p.id} style={styles.periodCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.periodLabel}>{p.label}</Text>
                <Text style={styles.periodDates}>
                  Du {formatDate(p.start)} au {formatDate(p.end)}
                </Text>
                <Badge
                  label={`${daysBetween(p.start, p.end)} jours`}
                  variant="warning"
                  small
                  style={{ marginTop: spacing.sm }}
                />
              </View>
              <TouchableOpacity onPress={() => removePeriod(p.id)}>
                <Text style={styles.removeText}>Retirer</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Button label="Ajouter une période" icon="+" variant="pro" onPress={addPeriod} />
      </View>
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function daysBetween(start: string, end: string): number {
  const d1 = new Date(start).getTime();
  const d2 = new Date(end).getTime();
  return Math.round((d2 - d1) / 86_400_000) + 1;
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 36, color: colors.textLight, marginBottom: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  periodLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  periodDates: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  removeText: { fontSize: 12, fontWeight: '600', color: colors.error },
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
