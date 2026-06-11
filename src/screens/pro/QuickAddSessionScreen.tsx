// Quick-add session — adds one session to an EXISTING class. Full class
// creation (title, photos, weekly pattern, etc.) stays on the web admin.
//
// Mobile UX target: 4 taps max — pick class, pick day, pick time, confirm.
// Duration is inherited from the class so the prof doesn't re-enter it.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { coursesService } from '../../services/courses.service';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import { ClassOffer } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';

// Common teaching hours — finer than the chip row would otherwise allow.
// Each entry is { h, m } in 24-hour local time.
const TIME_SLOTS: Array<{ h: number; m: number }> = [];
for (let h = 7; h <= 21; h += 1) {
  TIME_SLOTS.push({ h, m: 0 });
  TIME_SLOTS.push({ h, m: 30 });
}

const DAYS_OF_WEEK_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function QuickAddSessionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const teacherId = useCurrentTeacherId();

  const classes: ClassOffer[] = useMemo(
    () => (teacherId ? coursesService.listForTeacher(teacherId) : []),
    [teacherId],
  );

  const [classId, setClassId] = useState<string | undefined>(
    classes[0]?.id,
  );
  useEffect(() => {
    // Default to the first class as soon as the list resolves.
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  // Generate the next 28 days as a horizontal chip row — covers a full
  // 4-week run without needing a date picker for the common case. For longer
  // horizons the prof should use the web admin's full scheduler.
  const days = useMemo(() => {
    const list: Array<{ key: string; label: string; sub: string; date: Date }> = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 28; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push({
        key: d.toISOString().slice(0, 10),
        label:
          i === 0 ? "Auj." : i === 1 ? 'Demain' : DAYS_OF_WEEK_SHORT[d.getDay()],
        sub: `${d.getDate()}`,
        date: d,
      });
    }
    return list;
  }, []);
  const [dayKey, setDayKey] = useState<string>(days[0].key);

  // Quick jumps so the prof doesn't scroll through every chip to reach week+1.
  const jumpDays = (offset: number) => {
    const target = days[offset];
    if (target) setDayKey(target.key);
  };

  const [time, setTime] = useState<{ h: number; m: number }>({ h: 18, m: 0 });

  const cls = classId ? coursesService.getClass(classId) : undefined;
  const [maxP, setMaxP] = useState<number>(cls?.maxParticipants ?? 10);
  useEffect(() => {
    // When the chosen class changes, sync max participants to its default.
    if (cls) setMaxP(cls.maxParticipants);
  }, [cls?.id, cls?.maxParticipants]);

  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!cls) return;
    const day = days.find((d) => d.key === dayKey)?.date ?? new Date();
    const start = new Date(day);
    start.setHours(time.h, time.m, 0, 0);
    if (start.getTime() < Date.now()) {
      Alert.alert(
        'Créneau dans le passé',
        "Cette session démarre avant maintenant — choisis une heure dans le futur.",
      );
      return;
    }
    const end = new Date(start.getTime() + cls.durationMinutes * 60_000);
    setSaving(true);
    try {
      await coursesService.createSession({
        classId: cls.id,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        maxParticipants: maxP,
      });
      Alert.alert(
        'Session ajoutée ✓',
        `${cls.title} · ${start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${pad(time.h)}h${time.m === 0 ? '' : pad(time.m)}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Empty state — no class yet, can't quick-add.
  if (classes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle session</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.emptyBox}>
          <Ionicons name="information-circle-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>Aucune activité publiée</Text>
          <Text style={styles.emptyText}>
            Crée d'abord une activité complète sur koureo.fr, puis tu pourras
            ajouter des sessions rapidement ici.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle session</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Class picker */}
        <Text style={styles.sectionLabel}>Activité</Text>
        <View style={styles.classesGrid}>
          {classes.map((c) => {
            const active = c.id === classId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.classChip, active && styles.classChipActive]}
                activeOpacity={0.85}
                onPress={() => setClassId(c.id)}
              >
                <Text style={[styles.classChipText, active && styles.classChipTextActive]} numberOfLines={1}>
                  {c.title}
                </Text>
                <Text style={[styles.classChipMeta, active && styles.classChipMetaActive]}>
                  {c.durationMinutes} min · {c.isFree ? 'Gratuit' : `${c.price}€`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Day */}
        <Text style={styles.sectionLabel}>Jour</Text>
        <View style={styles.jumpRow}>
          <TouchableOpacity style={styles.jumpChip} onPress={() => jumpDays(0)} activeOpacity={0.85}>
            <Text style={styles.jumpChipText}>Aujourd'hui</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.jumpChip} onPress={() => jumpDays(7)} activeOpacity={0.85}>
            <Text style={styles.jumpChipText}>+ 1 sem.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.jumpChip} onPress={() => jumpDays(14)} activeOpacity={0.85}>
            <Text style={styles.jumpChipText}>+ 2 sem.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.jumpChip} onPress={() => jumpDays(21)} activeOpacity={0.85}>
            <Text style={styles.jumpChipText}>+ 3 sem.</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayRow}
        >
          {days.map((d) => {
            const active = d.key === dayKey;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.dayChip, active && styles.dayChipActive]}
                activeOpacity={0.85}
                onPress={() => setDayKey(d.key)}
              >
                <Text style={[styles.dayChipLabel, active && styles.dayChipTextActive]}>
                  {d.label}
                </Text>
                <Text style={[styles.dayChipSub, active && styles.dayChipTextActive]}>
                  {d.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time */}
        <Text style={styles.sectionLabel}>Heure de début</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((t) => {
            const active = t.h === time.h && t.m === time.m;
            return (
              <TouchableOpacity
                key={`${t.h}-${t.m}`}
                style={[styles.timeChip, active && styles.timeChipActive]}
                activeOpacity={0.85}
                onPress={() => setTime(t)}
              >
                <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                  {pad(t.h)}h{t.m === 0 ? '' : pad(t.m)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Max participants */}
        <Text style={styles.sectionLabel}>Places disponibles</Text>
        <View style={styles.maxRow}>
          <TouchableOpacity
            style={[styles.maxBtn, maxP <= 1 && styles.maxBtnDisabled]}
            disabled={maxP <= 1}
            activeOpacity={0.85}
            onPress={() => setMaxP((n) => Math.max(1, n - 1))}
          >
            <Ionicons name="remove" size={20} color={maxP <= 1 ? colors.textLight : colors.text} />
          </TouchableOpacity>
          <View style={styles.maxValueWrap}>
            <Text style={styles.maxValue}>{maxP}</Text>
            <Text style={styles.maxLabel}>place{maxP > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.maxBtn}
            activeOpacity={0.85}
            onPress={() => setMaxP((n) => Math.min(99, n + 1))}
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, saving && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleCreate}
          disabled={saving || !cls}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>
            {saving ? 'Ajout en cours…' : 'Ajouter la session'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Empty state
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 8 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  // Class picker
  classesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  classChip: {
    flexGrow: 1,
    minWidth: '47%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  classChipActive: {
    backgroundColor: 'rgba(139,126,200,0.10)',
    borderColor: colors.proAccent,
  },
  classChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  classChipTextActive: { color: colors.proAccent },
  classChipMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  classChipMetaActive: { color: 'rgba(139,126,200,0.8)' },

  // Day chips
  dayRow: { gap: 8, paddingRight: spacing.lg },
  jumpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  jumpChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(139,126,200,0.12)',
  },
  jumpChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.proAccent,
    letterSpacing: 0.2,
  },
  dayChip: {
    width: 56,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  dayChipActive: {
    backgroundColor: 'rgba(139,126,200,0.10)',
    borderColor: colors.proAccent,
  },
  dayChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayChipSub: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  dayChipTextActive: { color: colors.proAccent },

  // Time chips
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 62,
    alignItems: 'center',
    ...shadows.sm,
  },
  timeChipActive: {
    backgroundColor: 'rgba(139,126,200,0.10)',
    borderColor: colors.proAccent,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  timeChipTextActive: { color: colors.proAccent },

  // Max participants stepper
  maxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  maxBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxBtnDisabled: {
    opacity: 0.4,
  },
  maxValueWrap: {
    flex: 1,
    alignItems: 'center',
  },
  maxValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  maxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: -2,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + 6,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.proAccent,
    paddingVertical: 14,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
