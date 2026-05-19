import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { availabilityService } from '../../services/availability.service';
import { WeekDayKey } from '../../types/domain';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';

const DAYS: { key: WeekDayKey; label: string }[] = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
];

// 30-min steps from 06:00 to 23:30
const TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let h = 6; h < 24; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
})();

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  open: boolean;
  slots: TimeSlot[];
}

export default function OpeningHoursScreen() {
  const navigation = useNavigation();
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(
    () => availabilityService.getOpeningHours(DEMO_TEACHER_ID),
  );

  // Time picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerContext, setPickerContext] = useState<{
    dayKey: string;
    slotIdx: number;
    field: 'start' | 'end';
  } | null>(null);

  const toggleDay = (key: string) => {
    setSchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, open: !prev[key]!.open },
    }));
  };

  const addSlot = (dayKey: string) => {
    setSchedule((prev) => {
      const day = prev[dayKey]!;
      if (day.slots.length >= 3) return prev;
      const last = day.slots[day.slots.length - 1]!;
      return {
        ...prev,
        [dayKey]: {
          ...day,
          slots: [...day.slots, { start: last.end, end: '20:00' }],
        },
      };
    });
  };

  const removeSlot = (dayKey: string, idx: number) => {
    setSchedule((prev) => {
      const day = prev[dayKey]!;
      if (day.slots.length <= 1) return prev;
      return {
        ...prev,
        [dayKey]: {
          ...day,
          slots: day.slots.filter((_, i) => i !== idx),
        },
      };
    });
  };

  const openPicker = (dayKey: string, slotIdx: number, field: 'start' | 'end') => {
    setPickerContext({ dayKey, slotIdx, field });
    setPickerOpen(true);
  };

  const applyTime = (time: string) => {
    if (!pickerContext) return;
    const { dayKey, slotIdx, field } = pickerContext;
    setSchedule((prev) => {
      const day = prev[dayKey]!;
      const newSlots = [...day.slots];
      newSlots[slotIdx] = { ...newSlots[slotIdx]!, [field]: time };
      return { ...prev, [dayKey]: { ...day, slots: newSlots } };
    });
    setPickerOpen(false);
    setPickerContext(null);
  };

  const copyToAll = (sourceKey: string) => {
    const source = schedule[sourceKey]!;
    Alert.alert(
      'Copier ces horaires ?',
      `Les horaires de ${DAYS.find((d) => d.key === sourceKey)?.label} seront appliqués à tous les autres jours ouverts.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Copier',
          onPress: () => {
            setSchedule((prev) => {
              const next = { ...prev };
              for (const d of DAYS) {
                if (d.key !== sourceKey && next[d.key]!.open) {
                  next[d.key] = {
                    ...next[d.key]!,
                    slots: source.slots.map((s) => ({ ...s })),
                  };
                }
              }
              return next;
            });
          },
        },
      ]
    );
  };

  const openDaysCount = Object.values(schedule).filter((d) => d.open).length;
  const totalHours = Object.values(schedule)
    .filter((d) => d.open)
    .reduce(
      (sum, d) =>
        sum + d.slots.reduce((s, slot) => s + diffHours(slot.start, slot.end), 0),
      0
    );

  const handleSave = () => {
    availabilityService.setOpeningHours(DEMO_TEACHER_ID, schedule as any);
    Alert.alert('Horaires enregistrés ✓', 'Les nouveaux créneaux seront proposés lors de la création d\'une offre.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Horaires d'ouverture</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{openDaysCount}</Text>
            <Text style={styles.summaryLabel}>Jours ouverts</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.summaryLabel}>Par semaine</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Tu peux ajouter plusieurs créneaux par jour (ex: matin + soir avec pause) et copier tes horaires d'un jour vers les autres.
        </Text>

        {DAYS.map((day) => {
          const s = schedule[day.key]!;
          return (
            <Card key={day.key} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  {!s.open && <Text style={styles.dayClosed}>Fermé</Text>}
                </View>
                <Switch
                  value={s.open}
                  onValueChange={() => toggleDay(day.key)}
                  trackColor={{ false: colors.border, true: colors.proAccent }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {s.open && (
                <>
                  {s.slots.map((slot, idx) => (
                    <View key={idx} style={styles.slotRow}>
                      <TouchableOpacity
                        style={styles.timeBtn}
                        onPress={() => openPicker(day.key, idx, 'start')}
                      >
                        <Text style={styles.timeBtnText}>{slot.start}</Text>
                      </TouchableOpacity>
                      <Text style={styles.dash}>–</Text>
                      <TouchableOpacity
                        style={styles.timeBtn}
                        onPress={() => openPicker(day.key, idx, 'end')}
                      >
                        <Text style={styles.timeBtnText}>{slot.end}</Text>
                      </TouchableOpacity>

                      {s.slots.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeSlot}
                          onPress={() => removeSlot(day.key, idx)}
                        >
                          <Text style={styles.removeSlotText}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <View style={styles.dayActions}>
                    {s.slots.length < 3 ? (
                      <TouchableOpacity onPress={() => addSlot(day.key)}>
                        <Text style={styles.actionText}>+ Ajouter un créneau</Text>
                      </TouchableOpacity>
                    ) : (
                      <View />
                    )}
                    {openDaysCount > 1 && (
                      <TouchableOpacity onPress={() => copyToAll(day.key)}>
                        <Text style={styles.actionTextSecondary}>Copier à tous</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* Time picker modal */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {pickerContext?.field === 'start' ? 'Heure de début' : 'Heure de fin'}
            </Text>
            <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
              {TIME_SLOTS.map((t) => {
                const currentValue = pickerContext
                  ? schedule[pickerContext.dayKey]!.slots[pickerContext.slotIdx]![
                      pickerContext.field
                    ]
                  : null;
                const active = t === currentValue;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeItem, active && styles.timeItemActive]}
                    onPress={() => applyTime(t)}
                  >
                    <Text style={[styles.timeItemText, active && styles.timeItemTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.bottom}>
        <Button label="Enregistrer" variant="pro" onPress={handleSave} />
      </View>
    </View>
  );
}

function diffHours(start: string, end: string): number {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  return h2! + m2! / 60 - (h1! + m1! / 60);
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

  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.proAccent,
    letterSpacing: -0.3,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
    marginTop: 3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },

  dayCard: { marginBottom: spacing.sm },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  dayLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  dayClosed: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2 },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  timeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
  },
  dash: { fontSize: 15, color: colors.textLight, fontWeight: '300' },
  removeSlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSlotText: { fontSize: 20, fontWeight: '600', color: colors.error },

  dayActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.proAccent },
  actionTextSecondary: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,23,20,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  timeList: { paddingHorizontal: spacing.lg },
  timeItem: { paddingVertical: 14, alignItems: 'center', borderRadius: radii.md, marginBottom: 4 },
  timeItemActive: { backgroundColor: colors.proAccent },
  timeItemText: { fontSize: 17, fontWeight: '500', color: colors.text, letterSpacing: 0.5 },
  timeItemTextActive: { color: '#FFFFFF', fontWeight: '700' },

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
