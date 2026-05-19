import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { teachersService } from '../../services/teachers.service';
import { coursesService } from '../../services/courses.service';
import { availabilityService } from '../../services/availability.service';
import {
  CandidateSlot,
  ScheduleConflict,
  WeekDayKey,
  WeeklyPattern,
} from '../../types/domain';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';

const CATEGORIES = [
  'Yoga', 'Danse', 'Musique', 'Sport', 'Bien-être', 'Langues',
  'Créatif', 'Cuisine', 'Développement personnel', 'Enfants', 'Business',
];
const FORMATS = [
  { value: 'individual', label: 'Individuel' },
  { value: 'group', label: 'Collectif' },
];
const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'all', label: 'Tous niveaux' },
];

const DAYS: { key: WeekDayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Lundi',    short: 'Lun' },
  { key: 'tue', label: 'Mardi',    short: 'Mar' },
  { key: 'wed', label: 'Mercredi', short: 'Mer' },
  { key: 'thu', label: 'Jeudi',    short: 'Jeu' },
  { key: 'fri', label: 'Vendredi', short: 'Ven' },
  { key: 'sat', label: 'Samedi',   short: 'Sam' },
  { key: 'sun', label: 'Dimanche', short: 'Dim' },
];

const WEEKS_AHEAD = 8;

const emptyPattern = (): WeeklyPattern => ({
  mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
});

// Reverse-engineer a weekly pattern from an offer's existing future sessions.
// Useful when editing: we preselect the pattern the pro has been using.
function inferPatternFromOfferId(offerId: string | undefined): WeeklyPattern {
  const p = emptyPattern();
  if (!offerId) return p;
  const now = Date.now();
  const sessions = coursesService
    .getSessions(offerId)
    .filter((s) => new Date(s.startsAt).getTime() > now);

  const seen = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.startsAt);
    const jsDay = d.getDay(); // 0..6, Sunday=0
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    const key = DAYS[idx]!.key;
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const uniq = `${key}-${hm}`;
    if (!seen.has(uniq)) {
      seen.add(uniq);
      p[key].push(hm);
    }
  }
  // Sort each day's times
  for (const k of DAYS.map((d) => d.key)) p[k].sort();
  return p;
}

export default function CreateClassScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const editingOfferId: string | undefined = route.params?.offerId;
  const editingOffer = editingOfferId ? coursesService.getClass(editingOfferId) : undefined;
  const isEditing = !!editingOffer;

  const teacherId = useCurrentTeacherId();
  const canPrice = teacherId ? teachersService.canCreatePaidClass(teacherId) : false;
  const photosComplete = teacherId ? teachersService.hasCompletePhotos(teacherId) : false;

  // Safety: redirect if photos missing (creation only — editing existing is fine).
  // IMPORTANT: useCurrentTeacherId() resolves async, so on the very first render
  // `teacherId` is undefined → `photosComplete` is false. Without the
  // `teacherId` guard, the alert fires before we even know whether photos are
  // present, kicking the user out for nothing.
  useEffect(() => {
    if (!teacherId || isEditing) return;
    if (!photosComplete) {
      Alert.alert(
        'Photos requises',
        "Tu dois d'abord ajouter tes 3 photos.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [teacherId, photosComplete, navigation, isEditing]);

  const [title, setTitle] = useState(editingOffer?.title ?? '');
  const [category, setCategory] = useState<string>(editingOffer?.category ?? '');
  const [format, setFormat] = useState<string>(editingOffer?.format ?? 'group');
  const [level, setLevel] = useState<string>(editingOffer?.level ?? 'all');
  const [description, setDescription] = useState(editingOffer?.description ?? '');
  const [duration, setDuration] = useState(
    editingOffer ? String(editingOffer.durationMinutes) : ''
  );
  const [price, setPrice] = useState(
    editingOffer && !editingOffer.isFree ? String(editingOffer.price) : ''
  );
  const [maxParticipants, setMaxParticipants] = useState(
    editingOffer ? String(editingOffer.maxParticipants) : ''
  );
  const [externalBooked, setExternalBooked] = useState('0');
  const [address, setAddress] = useState('');

  // Weekly pattern (core state). Infer from existing sessions when editing.
  const [pattern, setPattern] = useState<WeeklyPattern>(
    () => inferPatternFromOfferId(editingOfferId),
  );

  // Time picker modal for adding a slot to a given day
  const [pickerDay, setPickerDay] = useState<WeekDayKey | null>(null);

  // Custom success modal shown after publish/update. Replaces the native
  // Alert.alert so we can render stat pills + conflict details with proper
  // styling — the native alert was unreadable for non-trivial summaries.
  const [publishResult, setPublishResult] = useState<{
    isEditing: boolean;
    title: string;
    summary: { created: number; cancelled: number; kept: number } | null;
    sessionsCount: number;
    isIndividual: boolean;
    conflicts: ScheduleConflict[];
  } | null>(null);

  const durationMin = parseInt(duration, 10) || 0;

  // Expand the pattern to concrete sessions over the horizon, and check for
  // conflicts with the pro's other offers. Recomputed on any relevant change.
  const [expanded, setExpanded] = useState<CandidateSlot[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);

  useEffect(() => {
    if (durationMin <= 0 || !teacherId) {
      setExpanded([]);
      setConflicts([]);
      return;
    }
    const slots = availabilityService.expandPattern(
      teacherId, pattern, durationMin, WEEKS_AHEAD,
    );
    setExpanded(slots);
    const classConflicts = availabilityService.findConflicts(
      teacherId, slots, editingOfferId,
    );
    // Personal-calendar conflicts are fetched async (expo-calendar). If the
    // teacher hasn't connected their calendar, this just resolves to [].
    let cancelled = false;
    setConflicts(classConflicts);
    availabilityService
      .findCalendarConflicts(teacherId, slots)
      .then((calConflicts) => {
        if (cancelled) return;
        if (calConflicts.length === 0) return;
        const merged = [...classConflicts, ...calConflicts].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
        setConflicts(merged);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pattern, durationMin, editingOfferId, teacherId]);

  const addTimeToDay = (key: WeekDayKey, hm: string) => {
    setPattern((prev) => {
      const current = prev[key];
      if (current.includes(hm)) return prev;
      return { ...prev, [key]: [...current, hm].sort() };
    });
  };

  const removeTimeFromDay = (key: WeekDayKey, hm: string) => {
    setPattern((prev) => ({
      ...prev,
      [key]: prev[key].filter((t) => t !== hm),
    }));
  };

  const copyDayTo = (sourceKey: WeekDayKey, targetKeys: WeekDayKey[]) => {
    setPattern((prev) => {
      const next = { ...prev };
      for (const k of targetKeys) {
        next[k] = [...prev[sourceKey]];
      }
      return next;
    });
  };

  const activeDays = useMemo(
    () => DAYS.filter((d) => pattern[d.key].length > 0).map((d) => d.key),
    [pattern],
  );

  // Allowed start times for the picker, based on the teacher's opening hours
  // for the target weekday and the current class duration.
  const pickerAllowedTimes = useMemo(() => {
    if (!pickerDay || durationMin <= 0 || !teacherId) return [];
    return availabilityService.getAllowedStartTimes(
      teacherId, pickerDay, durationMin, 30,
    );
  }, [pickerDay, durationMin, teacherId]);

  const existingBookedSessions = useMemo(() => {
    if (!editingOffer) return [];
    return coursesService
      .getSessions(editingOffer.id)
      .filter((s) => s.bookedCount > 0);
  }, [editingOffer]);

  // On web, Alert.alert doesn't fire the OK button's onPress callback. To
  // keep the save flow reliable on both iOS and web, we call goBack() via a
  // short setTimeout so the alert has time to appear but the navigation still
  // happens without needing the user to tap OK.
  const goBackSoon = () => setTimeout(() => navigation.goBack(), 400);

  const handlePublish = async () => {
    if (!title || !category || (canPrice && !price)) {
      Alert.alert('Champs manquants', 'Remplis au moins le titre, la catégorie et le prix.');
      return;
    }
    if (durationMin <= 0) {
      Alert.alert('Durée manquante', "Indique la durée du cours pour configurer la semaine type.");
      return;
    }
    const needsPattern = format !== 'individual';
    if (needsPattern && expanded.length === 0) {
      Alert.alert(
        'Aucune séance programmée',
        "Ajoute au moins un créneau à ta semaine type pour publier l'offre.",
      );
      return;
    }

    // For editing an existing offer in "collectif" mode, reconcile its
    // concrete sessions so the new schedule is immediately visible to users.
    let summary: { created: number; cancelled: number; kept: number } | null = null;
    if (isEditing && needsPattern && editingOffer) {
      summary = await coursesService.syncSessionsForClass(
        editingOffer.id,
        expanded.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })),
        parseInt(maxParticipants, 10) || editingOffer.maxParticipants,
      );
    }


    setPublishResult({
      isEditing,
      title,
      summary,
      sessionsCount: expanded.length,
      isIndividual: !needsPattern,
      conflicts,
    });
  };

  const handleDelete = () => {
    if (!isEditing) return;
    const hasBookings = existingBookedSessions.length > 0;
    Alert.alert(
      `Supprimer "${editingOffer!.title}" ?`,
      hasBookings
        ? `Attention : ${existingBookedSessions.length} session${existingBookedSessions.length > 1 ? 's ont' : ' a'} des réservations. Les participants devront être remboursés.`
        : "L'offre sera retirée de la carte. Les futurs créneaux ne seront plus réservables.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Offre supprimée ✓', '');
            goBackSoon();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Modifier l'offre" : 'Nouvelle offre'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 160 }}>
        <Text style={styles.sectionTitle}>Infos principales</Text>

        <Input
          label="Titre du cours *"
          placeholder="Ex: Salsa Débutant"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.miniLabel}>Catégorie *</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <ChipOption
              key={cat}
              label={cat}
              active={category === cat}
              onPress={() => setCategory(cat)}
            />
          ))}
        </View>

        <Text style={styles.miniLabel}>Format</Text>
        <View style={styles.chipRow}>
          {FORMATS.map((f) => (
            <ChipOption
              key={f.value}
              label={f.label}
              active={format === f.value}
              onPress={() => setFormat(f.value)}
            />
          ))}
        </View>

        <Text style={styles.miniLabel}>Niveau</Text>
        <View style={styles.chipRow}>
          {LEVELS.map((l) => (
            <ChipOption
              key={l.value}
              label={l.label}
              active={level === l.value}
              onPress={() => setLevel(l.value)}
            />
          ))}
        </View>

        <Input
          label="Description"
          placeholder="Décris ton cours, ce que les élèves vont apprendre…"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />

        <Text style={styles.sectionTitle}>Détails pratiques</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Durée (min) *"
              placeholder="90"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              hint="Requise pour la semaine type"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={canPrice ? 'Prix (€) *' : 'Prix (verrouillé)'}
              placeholder={canPrice ? '12' : 'Gratuit'}
              value={canPrice ? price : ''}
              onChangeText={canPrice ? setPrice : () => {}}
              keyboardType="numeric"
              editable={canPrice}
              hint={canPrice ? undefined : 'Tu es en phase d\'évaluation — cours gratuits uniquement'}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Places totales *"
              placeholder="15"
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="numeric"
              hint="Capacité totale de ta salle"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Déjà prises hors Koureo"
              placeholder="0"
              value={externalBooked}
              onChangeText={setExternalBooked}
              keyboardType="numeric"
              hint="Clients habituels déjà inscrits"
            />
          </View>
        </View>

        {(() => {
          const total = parseInt(maxParticipants, 10) || 0;
          const external = parseInt(externalBooked, 10) || 0;
          const available = Math.max(0, total - external);
          if (total === 0) return null;
          return (
            <View style={styles.capacityPreview}>
              <Text style={styles.capacityPreviewText}>
                <Text style={styles.capacityPreviewBold}>{available}</Text>
                {' place'}{available > 1 ? 's' : ''}{' '}
                ouverte{available > 1 ? 's' : ''} à la réservation sur Koureo
                {external > 0 ? ` (${external} déjà prise${external > 1 ? 's' : ''} hors app)` : ''}.
              </Text>
            </View>
          );
        })()}

        <Input
          label="Adresse du cours"
          placeholder="15 Rue de la Monnaie, Rennes"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.sectionTitle}>
          {format === 'individual' ? 'Créneaux' : 'Semaine type'}
        </Text>

        {format === 'individual' ? (
          // Individuel → no schedule to set. Slots are auto-generated from the
          // teacher's opening hours (Planity-style). Zero config per offer.
          <View style={styles.autoBox}>
            <Text style={styles.autoIcon}>📆</Text>
            <Text style={styles.autoTitle}>Créneaux automatiques</Text>
            <Text style={styles.autoText}>
              Les élèves pourront réserver n'importe quelle heure libre dans tes
              horaires d'ouverture, hors périodes fermées et événements de ton
              agenda.
            </Text>
            <Text style={styles.autoHint}>
              Modifie-les dans{' '}
              <Text style={styles.autoHintBold}>
                Réglages › Horaires d'ouverture
              </Text>
              .
            </Text>
          </View>
        ) : durationMin <= 0 ? (
          <Card style={styles.slotEmpty}>
            <Text style={styles.slotEmptyText}>
              Indique la durée du cours pour configurer la semaine type.
            </Text>
          </Card>
        ) : (
          <>
            <Text style={styles.sectionHint}>
              Tape{' '}
              <Text style={styles.sectionHintBold}>+</Text>{' '}
              sous un jour pour y ajouter une heure. Tape sur une heure pour la
              retirer. Koureo répétera ton planning sur les{' '}
              <Text style={styles.sectionHintBold}>
                {WEEKS_AHEAD} prochaines semaines
              </Text>
              .
            </Text>

            {/* Weekly grid — 7 columns, one per weekday */}
            <View style={styles.grid}>
              {DAYS.map((d) => {
                const times = pattern[d.key];
                const isToday = new Date().getDay() === (d.key === 'sun' ? 0 : DAYS.findIndex((x) => x.key === d.key) + 1);
                return (
                  <View key={d.key} style={styles.gridCol}>
                    <Text style={[styles.gridHeader, isToday && styles.gridHeaderToday]}>
                      {d.short}
                    </Text>
                    <View style={styles.gridStack}>
                      {times.map((hm) => (
                        <TouchableOpacity
                          key={hm}
                          style={styles.slotPill}
                          onPress={() => removeTimeFromDay(d.key, hm)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.slotPillText}>{hm}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.addCell}
                        onPress={() => setPickerDay(d.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.addCellText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Copy first configured day to all others — shortcut */}
            {activeDays.length >= 1 && activeDays.length < 7 && (
              <TouchableOpacity
                style={styles.copyAll}
                onPress={() => {
                  const sourceKey = activeDays[0]!;
                  copyDayTo(
                    sourceKey,
                    DAYS.map((d) => d.key).filter((k) => k !== sourceKey),
                  );
                }}
              >
                <Text style={styles.copyAllText}>
                  ⇄ Appliquer {DAYS.find((d) => d.key === activeDays[0])?.label.toLowerCase()} à tous les jours
                </Text>
              </TouchableOpacity>
            )}

            {/* Preview */}
            {expanded.length > 0 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>
                  {expanded.length} session{expanded.length > 1 ? 's' : ''} générée{expanded.length > 1 ? 's' : ''} sur {WEEKS_AHEAD} semaines
                </Text>
                <Text style={styles.previewSub}>
                  Première : {expanded[0]!.dayLabel} · {expanded[0]!.timeLabel}
                </Text>
              </View>
            )}

            {/* Conflicts warning */}
            {conflicts.length > 0 && (() => {
              const calCount = conflicts.filter((c) => c.kind === 'calendar').length;
              const classCount = conflicts.length - calCount;
              const titleParts: string[] = [];
              if (classCount > 0) titleParts.push(`${classCount} avec tes autres offres`);
              if (calCount > 0) titleParts.push(`${calCount} avec ton calendrier perso`);
              return (
                <View style={styles.conflictBox}>
                  <Text style={styles.conflictTitle}>
                    ⚠ {conflicts.length} chevauchement{conflicts.length > 1 ? 's' : ''} — {titleParts.join(' · ')}
                  </Text>
                  {conflicts.slice(0, 4).map((c) => (
                    <Text key={`${c.startsAt}-${c.kind}`} style={styles.conflictLine}>
                      • {c.dayLabel} · {c.timeLabel} — {c.kind === 'calendar'
                        ? `déjà occupé : ${c.conflictWith}`
                        : `en même temps que "${c.conflictWith}"`}
                    </Text>
                  ))}
                  {conflicts.length > 4 && (
                    <Text style={styles.conflictLine}>
                      • … et {conflicts.length - 4} autres
                    </Text>
                  )}
                  <Text style={styles.conflictHint}>
                    Non bloquant — tu peux publier quand même si tu veux.
                  </Text>
                </View>
              );
            })()}
          </>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={isEditing ? 'Enregistrer les modifications' : "Publier l'offre"}
          variant="pro"
          onPress={handlePublish}
        />
        {isEditing && (
          <TouchableOpacity style={styles.deleteLink} onPress={handleDelete}>
            <Text style={styles.deleteLinkText}>Supprimer cette offre</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Time picker modal */}
      <Modal
        visible={pickerDay !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerDay(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerDay(null)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {pickerDay ? `Heure de début — ${DAYS.find((d) => d.key === pickerDay)?.label}` : ''}
            </Text>
            {pickerAllowedTimes.length === 0 ? (
              <Text style={styles.modalEmpty}>
                Aucun créneau ne rentre dans tes horaires d'ouverture ce jour-là
                avec cette durée. Élargis tes horaires (Réglages › Horaires
                d'ouverture) ou réduis la durée du cours.
              </Text>
            ) : (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {pickerAllowedTimes.map((t) => {
                  const alreadyAdded = pickerDay ? pattern[pickerDay].includes(t) : false;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.modalItem, alreadyAdded && styles.modalItemDisabled]}
                      disabled={alreadyAdded}
                      onPress={() => {
                        if (pickerDay) addTimeToDay(pickerDay, t);
                        setPickerDay(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          alreadyAdded && styles.modalItemTextDisabled,
                        ]}
                      >
                        {t} {alreadyAdded ? '(déjà ajouté)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success modal — shown after publish/update */}
      <Modal
        visible={publishResult !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPublishResult(null)}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={36} color="#FFFFFF" />
              </View>
              {publishResult && !publishResult.isEditing && (
                <View style={styles.successSparkle}>
                  <Ionicons name="sparkles" size={16} color={colors.accent} />
                </View>
              )}
            </View>

            <Text style={styles.successTitle}>
              {publishResult?.isEditing ? 'Offre mise à jour' : 'Offre publiée !'}
            </Text>
            <Text style={styles.successSubtitle} numberOfLines={2}>
              {publishResult?.title}
            </Text>

            {publishResult && !publishResult.isIndividual && (
              <View style={styles.successStats}>
                {publishResult.summary ? (
                  <>
                    <SuccessStat
                      value={publishResult.summary.created}
                      label={publishResult.summary.created > 1 ? 'ajoutés' : 'ajouté'}
                      tone="positive"
                      icon="add-circle"
                    />
                    <SuccessStat
                      value={publishResult.summary.cancelled}
                      label={publishResult.summary.cancelled > 1 ? 'retirés' : 'retiré'}
                      tone="muted"
                      icon="remove-circle"
                    />
                    <SuccessStat
                      value={publishResult.summary.kept}
                      label={publishResult.summary.kept > 1 ? 'conservés' : 'conservé'}
                      tone="neutral"
                      icon="bookmark"
                    />
                  </>
                ) : (
                  <SuccessStat
                    value={publishResult.sessionsCount}
                    label={`session${publishResult.sessionsCount > 1 ? 's' : ''} sur ${WEEKS_AHEAD} sem.`}
                    tone="positive"
                    icon="calendar"
                    wide
                  />
                )}
              </View>
            )}

            {publishResult && publishResult.isIndividual && (
              <Text style={styles.successHint}>
                Créneaux auto-générés depuis tes horaires d'ouverture.
              </Text>
            )}

            {publishResult && publishResult.conflicts.length > 0 && (
              <View style={styles.successWarnBox}>
                <View style={styles.successWarnHeader}>
                  <Ionicons name="alert-circle" size={18} color={colors.warning} />
                  <Text style={styles.successWarnTitle}>
                    {publishResult.conflicts.length} chevauchement
                    {publishResult.conflicts.length > 1 ? 's' : ''} à vérifier
                  </Text>
                </View>
                {publishResult.conflicts.slice(0, 3).map((c) => (
                  <View key={`${c.startsAt}-${c.kind}`} style={styles.successWarnLine}>
                    <Ionicons
                      name={c.kind === 'calendar' ? 'person-circle-outline' : 'repeat'}
                      size={14}
                      color={colors.textSecondary}
                      style={{ marginTop: 2 }}
                    />
                    <Text style={styles.successWarnText}>
                      <Text style={styles.successWarnWhen}>
                        {c.dayLabel} · {c.timeLabel}
                      </Text>
                      {'\n'}
                      {c.kind === 'calendar'
                        ? `déjà occupé : ${c.conflictWith}`
                        : `chevauche "${c.conflictWith}"`}
                    </Text>
                  </View>
                ))}
                {publishResult.conflicts.length > 3 && (
                  <Text style={styles.successWarnMore}>
                    + {publishResult.conflicts.length - 3} autre
                    {publishResult.conflicts.length - 3 > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.successButton}
              activeOpacity={0.85}
              onPress={() => {
                setPublishResult(null);
                navigation.goBack();
              }}
            >
              <Text style={styles.successButtonText}>
                {publishResult?.isEditing ? 'Parfait' : "C'est parti"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

type SuccessStatTone = 'positive' | 'muted' | 'neutral';

function SuccessStat({
  value, label, tone, icon, wide,
}: {
  value: number;
  label: string;
  tone: SuccessStatTone;
  icon: keyof typeof Ionicons.glyphMap;
  wide?: boolean;
}) {
  const palette: Record<SuccessStatTone, { bg: string; fg: string; icon: string }> = {
    positive: { bg: colors.surface, fg: colors.primaryDark, icon: colors.primary },
    muted: { bg: '#F5F0E8', fg: '#8C7A4F', icon: '#C9A96E' },
    neutral: { bg: '#F2F3F5', fg: '#5F6A75', icon: '#8A95A1' },
  };
  const c = palette[tone];
  return (
    <View style={[styles.statPill, wide && styles.statPillWide, { backgroundColor: c.bg }]}>
      <Ionicons name={icon} size={16} color={c.icon} />
      <Text style={[styles.statPillValue, { color: c.fg }]}>{value}</Text>
      <Text style={[styles.statPillLabel, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

function ChipOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
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
  close: { fontSize: 22, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md, marginTop: spacing.sm },
  sectionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  sectionHintBold: {
    color: colors.text,
    fontWeight: '600',
  },
  miniLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.proAccent, borderColor: colors.proAccent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row', gap: spacing.md },
  capacityPreview: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.proAccent,
  },
  capacityPreviewText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  capacityPreviewBold: {
    fontWeight: '700',
    color: colors.text,
  },

  slotEmpty: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  slotEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Auto (individual format) info box
  autoBox: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  autoIcon: { fontSize: 32, marginBottom: spacing.sm },
  autoTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  autoText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  autoHint: { fontSize: 12, color: colors.textLight, textAlign: 'center' },
  autoHintBold: { color: colors.text, fontWeight: '600' },

  // Weekly grid (collectif format)
  grid: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  gridCol: {
    flex: 1,
    alignItems: 'stretch',
  },
  gridHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    marginBottom: 6,
  },
  gridHeaderToday: {
    color: colors.proAccent,
  },
  gridStack: {
    gap: 4,
    alignItems: 'stretch',
  },
  slotPill: {
    backgroundColor: colors.proAccent,
    paddingVertical: 9,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  slotPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  addCell: {
    paddingVertical: 9,
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.card,
  },
  addCellText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textLight,
  },
  copyAll: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  copyAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.proAccent,
  },

  previewBox: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  previewTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  previewSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  conflictBox: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  conflictTitle: { fontSize: 13, fontWeight: '700', color: '#8B6D00', marginBottom: spacing.xs },
  conflictLine: { fontSize: 12, color: '#6B5600', lineHeight: 17 },
  conflictHint: { fontSize: 11, fontStyle: 'italic', color: '#6B5600', marginTop: spacing.xs },

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
  deleteLink: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deleteLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },

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
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modalEmpty: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    lineHeight: 19,
  },
  modalList: { paddingHorizontal: spacing.lg },
  modalItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radii.md,
    marginBottom: 4,
  },
  modalItemDisabled: { opacity: 0.35 },
  modalItemText: { fontSize: 17, fontWeight: '500', color: colors.text, letterSpacing: 0.5 },
  modalItemTextDisabled: { color: colors.textLight },

  // Success modal — replaces native Alert.alert after publish/update
  successBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  successCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.cardHover,
  },
  successIconWrap: {
    width: 76,
    height: 76,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  successSparkle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.card,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  successStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    width: '100%',
    marginBottom: spacing.md,
  },
  statPill: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: 2,
  },
  statPillWide: {
    flexBasis: '100%',
    paddingVertical: spacing.md,
  },
  statPillValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  successHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  successWarnBox: {
    width: '100%',
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
    gap: 8,
  },
  successWarnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successWarnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B6D00',
    letterSpacing: 0.1,
  },
  successWarnLine: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  successWarnText: {
    flex: 1,
    fontSize: 12,
    color: '#6B5600',
    lineHeight: 17,
  },
  successWarnWhen: {
    fontWeight: '600',
    color: '#5A4800',
  },
  successWarnMore: {
    fontSize: 11,
    color: '#8B6D00',
    fontStyle: 'italic',
    marginTop: 2,
  },
  successButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
    ...shadows.button,
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.4,
  },
});
