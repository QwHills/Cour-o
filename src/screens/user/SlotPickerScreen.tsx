import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { availabilityService } from '../../services/availability.service';
import { coursesService } from '../../services/courses.service';
import { AvailableSlot } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import SessionSlot from '../../components/SessionSlot';
import Button from '../../components/ui/Button';
import { formatDateLabel, formatTimeLabel, formatFullDate } from '../../utils/date';

export default function SlotPickerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const courseId: string = route.params.courseId;
  const course = coursesService.get(courseId);

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  // Multi-select: user can add several slots to cart before checkout.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    availabilityService
      .getSlotsForClass(courseId, new Date(), new Date())
      .then(setSlots);
  }, [courseId]);

  if (!course) return <View style={styles.container} />;

  // Group by day
  const grouped: Record<string, AvailableSlot[]> = {};
  for (const slot of slots) {
    const key = formatFullDate(slot.startsAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(slot);
  }
  const sections = Object.entries(grouped).map(([title, data]) => ({ title, data }));

  const toggleSlot = (sessionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const totalPrice = selectedCount * course.class.price;
  const isFree = course.class.isFree;

  const handleContinue = () => {
    if (selectedCount === 0) return;
    navigation.navigate('Checkout', {
      courseId,
      sessionIds: Array.from(selectedIds),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choisir un créneau</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 160 }}>
        <Text style={styles.courseName}>{course.class.title}</Text>
        <Text style={styles.proName}>avec {course.teacher?.displayName}</Text>
        <Text style={styles.helperText}>
          Tape sur les créneaux qui te conviennent — tu peux en sélectionner plusieurs.
        </Text>

        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>Aucun créneau disponible</Text>
            <Text style={styles.emptyText}>Reviens plus tard pour voir les nouvelles disponibilités.</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.daySection}>
              <Text style={styles.dayTitle}>{section.title}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {section.data.map((slot) => (
                  <SessionSlot
                    key={slot.sessionId}
                    dateLabel={formatDateLabel(slot.startsAt)}
                    timeLabel={formatTimeLabel(slot.startsAt)}
                    spotsLeft={slot.spotsLeft}
                    maxSpots={course.class.maxParticipants}
                    selected={selectedIds.has(slot.sessionId)}
                    full={slot.spotsLeft <= 0}
                    onPress={() => toggleSlot(slot.sessionId)}
                  />
                ))}
              </ScrollView>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottom}>
        {selectedCount > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryCount}>
              {selectedCount} créneau{selectedCount > 1 ? 'x' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.summaryTotal}>
              {isFree ? 'Gratuit' : `${totalPrice.toFixed(2)}€`}
            </Text>
          </View>
        )}
        <Button
          label={
            selectedCount === 0
              ? 'Sélectionne un créneau'
              : selectedCount === 1
                ? 'Continuer'
                : `Continuer (${selectedCount} créneaux)`
          }
          onPress={handleContinue}
          disabled={selectedCount === 0}
        />
      </View>
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
  close: { fontSize: 22, color: colors.text, fontWeight: '600', width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  courseName: { fontSize: 22, fontWeight: '800', color: colors.text },
  proName: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  helperText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 17,
  },
  daySection: { marginBottom: spacing.lg },
  dayTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  emptyState: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
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
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  summaryCount: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
