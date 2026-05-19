// Detailed view of a session's participants — accessible by tapping the
// session card on ProPlanningScreen. Shows :
//   • real bookings (with user name, payment method badge, #classes attended
//     with this teacher)
//   • manually-added participants (trial sessions / walk-ins)
//   • an inline "+ Ajouter un participant" button that opens a modal

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import { bookingsService } from '../../services/bookings.service';
import { coursesService } from '../../services/courses.service';
import { manualParticipantsService } from '../../services/manualParticipants.service';
import { supabase } from '../../services/supabase/client';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import {
  Booking,
  ManualParticipant,
} from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { formatFullDate, formatTimeLabel } from '../../utils/date';

interface UserLite {
  id: string;
  name: string;
  email: string;
}

export default function SessionParticipantsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const sessionId: string = route.params.sessionId;
  const teacherId = useCurrentTeacherId();

  const session = coursesService.getSession(sessionId);
  const cls = session ? coursesService.getClass(session.classId) : null;

  const [, setTick] = useState(0);
  useEffect(() => {
    const u1 = bookingsService.onChange(() => setTick((t) => t + 1));
    const u2 = manualParticipantsService.onChange(() => setTick((t) => t + 1));
    if (teacherId) {
      manualParticipantsService.loadForTeacher(teacherId).catch(() => {});
      bookingsService.load().catch(() => {});
    }
    return () => {
      u1();
      u2();
    };
  }, [teacherId]);

  // Refresh on screen focus so a booking done in another tab shows up here.
  useFocusEffect(
    React.useCallback(() => {
      bookingsService.load().catch(() => {});
      if (teacherId) manualParticipantsService.loadForTeacher(teacherId).catch(() => {});
    }, [teacherId]),
  );

  // Bookings for this session (status = confirmed or completed only)
  const bookings = useMemo<Booking[]>(() => {
    if (!teacherId) return [];
    return bookingsService
      .listForTeacher(teacherId)
      .filter(
        (b) =>
          b.sessionId === sessionId &&
          (b.status === 'confirmed' || b.status === 'completed'),
      );
  }, [sessionId, teacherId]);

  // Manual participants for this session
  const manuals = manualParticipantsService.listForSession(sessionId);

  // For each booking user, how many past bookings they have with this
  // teacher (loyalty indicator).
  const pastCountByUser = useMemo(() => {
    if (!teacherId) return new Map<string, number>();
    const now = Date.now();
    const map = new Map<string, number>();
    bookingsService.listForTeacher(teacherId).forEach((b) => {
      if (new Date(b.sessionStartsAt).getTime() < now) {
        map.set(b.userId, (map.get(b.userId) ?? 0) + 1);
      }
    });
    return map;
  }, [teacherId, bookings.length]); // re-run when bookings cache changes

  // Fetch user profiles referenced by bookings so we can display real names.
  const [userProfiles, setUserProfiles] = useState<Map<string, UserLite>>(new Map());
  useEffect(() => {
    const ids = bookings.map((b) => b.userId);
    if (ids.length === 0) return;
    supabase
      .from('users')
      .select('id, name, email')
      .in('id', ids)
      .then(({ data }) => {
        const map = new Map<string, UserLite>();
        (data ?? []).forEach((u: any) => map.set(u.id, u));
        setUserProfiles(map);
      });
  }, [bookings.map((b) => b.userId).join(',')]);

  const [addOpen, setAddOpen] = useState(false);

  if (!session || !cls) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Participants</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.empty}>Session introuvable.</Text>
        </View>
      </View>
    );
  }

  const totalParticipants = bookings.length + manuals.length;

  const handleRemoveManual = (id: string, name: string) => {
    Alert.alert(
      'Retirer ce participant ?',
      `${name} sera retiré de la liste.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => manualParticipantsService.remove(id).catch(() => {}),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Participants</Text>
        <TouchableOpacity
          onPress={() => setAddOpen(true)}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Session summary */}
        <Card style={styles.summary}>
          <Text style={styles.summaryClass}>{cls.title}</Text>
          <Text style={styles.summaryMeta}>
            {formatFullDate(session.startsAt)} · {formatTimeLabel(session.startsAt)}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{totalParticipants}</Text>
              <Text style={styles.summaryLabel}>
                participant{totalParticipants > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {session.maxParticipants - totalParticipants}
              </Text>
              <Text style={styles.summaryLabel}>places libres</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{manuals.length}</Text>
              <Text style={styles.summaryLabel}>ajouts manuels</Text>
            </View>
          </View>
        </Card>

        {totalParticipants === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Aucun participant</Text>
            <Text style={styles.emptyText}>
              Les élèves qui réservent via l'app apparaîtront ici. Tu peux
              aussi en ajouter manuellement (essai, walk-in…).
            </Text>
            <Button
              label="+ Ajouter un participant"
              variant="pro"
              onPress={() => setAddOpen(true)}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          <>
            {bookings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Inscrits · {bookings.length}
                </Text>
                {bookings.map((b) => {
                  const profile = userProfiles.get(b.userId);
                  const displayName = profile?.name ?? 'Utilisateur';
                  const visits = pastCountByUser.get(b.userId) ?? 0;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      activeOpacity={0.85}
                      onPress={() =>
                        // Pass the already-known name as a navigation param
                        // so the detail screen shows it instantly while
                        // refetching the rest of the profile.
                        (navigation as any).navigate('ParticipantHistory', {
                          userId: b.userId,
                          initialName: displayName,
                        })
                      }
                    >
                      <BookingRow
                        booking={b}
                        name={displayName}
                        previousVisits={visits}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {manuals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Ajouts manuels · {manuals.length}
                </Text>
                {manuals.map((p) => (
                  <ManualRow
                    key={p.id}
                    participant={p}
                    onRemove={() => handleRemoveManual(p.id, p.fullName)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <AddParticipantModal
        visible={addOpen}
        sessionId={sessionId}
        teacherId={teacherId ?? ''}
        addedBy={authService.getCurrentUser()?.id ?? ''}
        onClose={() => setAddOpen(false)}
      />
    </View>
  );
}

function BookingRow({
  booking,
  name,
  previousVisits,
}: {
  booking: Booking;
  name: string;
  previousVisits: number;
}) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  const paidWith = booking.priceTotal === 0 && !booking.isFree ? 'credits' : booking.isFree ? 'free' : 'cash';
  const paidBadge =
    paidWith === 'credits'
      ? { label: '🎟️ Crédits', variant: 'primary' as const }
      : paidWith === 'free'
        ? { label: 'Gratuit', variant: 'success' as const }
        : { label: '💳 Unité', variant: 'neutral' as const };

  return (
    <Card style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        <View style={styles.rowMeta}>
          <Badge label={paidBadge.label} variant={paidBadge.variant} small />
          <Text style={styles.rowVisits}>
            {previousVisits > 0
              ? `${previousVisits}e fois chez toi`
              : 'Première fois'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function ManualRow({
  participant,
  onRemove,
}: {
  participant: ManualParticipant;
  onRemove: () => void;
}) {
  const initial = participant.fullName.slice(0, 1).toUpperCase();
  return (
    <Card style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: '#ecfbf7' }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{participant.fullName}</Text>
        {participant.note ? (
          <Text style={styles.rowEmail} numberOfLines={1}>{participant.note}</Text>
        ) : null}
        <View style={styles.rowMeta}>
          <Badge label="Ajout manuel" variant="warning" small />
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Ionicons name="close-circle-outline" size={22} color={colors.error} />
      </TouchableOpacity>
    </Card>
  );
}

function AddParticipantModal({
  visible,
  sessionId,
  teacherId,
  addedBy,
  onClose,
}: {
  visible: boolean;
  sessionId: string;
  teacherId: string;
  addedBy: string;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('Séance d\'essai');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Nom manquant', 'Indique au moins le prénom du participant.');
      return;
    }
    if (!teacherId || !addedBy) {
      Alert.alert('Erreur', 'Identité non résolue.');
      return;
    }
    setLoading(true);
    try {
      await manualParticipantsService.add({
        sessionId,
        teacherId,
        fullName: name.trim(),
        note: note.trim() || undefined,
        addedBy,
      });
      setName('');
      setNote('Séance d\'essai');
      setTimeout(onClose, 200);
    } catch (e: any) {
      Alert.alert('Ajout impossible', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalBackdropTap} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Ajouter un participant</Text>
          <Text style={styles.modalSubtitle}>
            Pour une séance d'essai, un walk-in ou un invité qui n'est pas
            passé par l'app.
          </Text>

          <Input
            label="Nom complet *"
            placeholder="Ex: Clara Dupont"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Input
            label="Note (optionnel)"
            placeholder="Séance d'essai, walk-in, invité…"
            value={note}
            onChangeText={setNote}
          />

          <Button
            label={loading ? 'Ajout…' : "Ajouter à la session"}
            variant="pro"
            loading={loading}
            onPress={handleAdd}
            style={{ marginTop: spacing.md }}
          />
          <TouchableOpacity onPress={onClose} style={styles.cancelLink}>
            <Text style={styles.cancelLinkText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  addBtn: {
    backgroundColor: colors.proAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  scroll: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 14, color: colors.textLight },

  summary: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  summaryClass: { fontSize: 17, fontWeight: '800', color: colors.text },
  summaryMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  summaryStat: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.proAccent, letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },

  emptyState: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowEmail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  rowVisits: { fontSize: 11, color: colors.textLight, fontWeight: '500' },
  removeBtn: { padding: spacing.sm },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(26,23,20,0.4)', justifyContent: 'flex-end' },
  modalBackdropTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + 10,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  cancelLink: { paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  cancelLinkText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
});
