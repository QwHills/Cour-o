// Pro Attendance tab — quick "who's here today" check-in for teachers.
//
// Shows the next/current session of the day with its booked participants
// (Supabase bookings + manual walk-ins) and lets the teacher tick presence.
// Tick state is local-only for now — once `attendance_marks` lands in the DB
// we plug `bookingsService.markAttendance(...)` in place of the local Map.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { coursesService } from '../../services/courses.service';
import { bookingsService } from '../../services/bookings.service';
import { manualParticipantsService } from '../../services/manualParticipants.service';
import { messagingService } from '../../services/messaging.service';
import { attendanceService } from '../../services/attendance.service';
import { authService } from '../../services/auth.service';
import { teachersService } from '../../services/teachers.service';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import { supabase } from '../../services/supabase/client';
import { Booking, ClassSession, ClassOffer, ManualParticipant } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import { formatTimeLabel } from '../../utils/date';

type Attendee = {
  id: string;
  name: string;
  source: 'booking' | 'manual';
  // For sorting: booked customers first, walk-ins second.
  sortKey: number;
};

export default function ProAttendanceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const teacherId = useCurrentTeacherId();
  const [, setTick] = useState(0);
  // sessionId → attendeeId → present?
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  // bookingUserId → display name; resolved from Supabase users table.
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // Pull-to-refresh — re-fetch bookings + manual participants + attendance.
  const [refreshing, setRefreshing] = useState(false);

  // Hot-reload when bookings/sessions change.
  useEffect(() => {
    const u1 = bookingsService.onChange(() => setTick((t) => t + 1));
    const u2 = manualParticipantsService.onChange(() => setTick((t) => t + 1));
    const u3 = coursesService.onChange(() => setTick((t) => t + 1));
    if (teacherId) {
      manualParticipantsService.loadForTeacher(teacherId).catch(() => {});
      bookingsService.load().catch(() => {});
    }
    return () => { u1(); u2(); u3(); };
  }, [teacherId]);

  // Today's sessions for this teacher, soonest first (ongoing/upcoming only).
  const todaysSessions = useMemo<
    Array<{ session: ClassSession; cls: ClassOffer }>
  >(() => {
    if (!teacherId) return [];
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const classes = coursesService.listForTeacher(teacherId);
    const classById = new Map(classes.map((c) => [c.id, c]));
    return coursesService
      .allSessions()
      .filter((s) => classById.has(s.classId))
      .filter((s) => {
        const t = new Date(s.startsAt).getTime();
        return t >= startOfDay.getTime() && t <= endOfDay.getTime() && s.status !== 'cancelled';
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((s) => ({ session: s, cls: classById.get(s.classId)! }));
  }, [teacherId]);

  // Pick the "active" session — the one in progress or the next upcoming.
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  useEffect(() => {
    if (activeSessionId && todaysSessions.some((x) => x.session.id === activeSessionId)) return;
    const now = Date.now();
    // Prefer ongoing, otherwise next upcoming.
    const ongoing = todaysSessions.find((x) => {
      const s = new Date(x.session.startsAt).getTime();
      const e = new Date(x.session.endsAt).getTime();
      return s <= now && now <= e;
    });
    const next = todaysSessions.find((x) => new Date(x.session.startsAt).getTime() >= now);
    setActiveSessionId(ongoing?.session.id ?? next?.session.id ?? todaysSessions[0]?.session.id);
  }, [todaysSessions, activeSessionId]);

  const active = todaysSessions.find((x) => x.session.id === activeSessionId);

  // Real bookings + manual walk-ins for the active session.
  const attendees = useMemo<Attendee[]>(() => {
    if (!active || !teacherId) return [];
    const sessionId = active.session.id;
    const bookings = bookingsService
      .listForTeacher(teacherId)
      .filter((b) => b.sessionId === sessionId && (b.status === 'confirmed' || b.status === 'completed'));
    const manuals = manualParticipantsService.listForSession(sessionId);
    const list: Attendee[] = [
      ...bookings.map((b, i) => ({
        id: `bk_${b.id}`,
        name: userNames[b.userId] ?? '…',
        source: 'booking' as const,
        sortKey: i,
      })),
      ...manuals.map((m: ManualParticipant, i: number) => ({
        id: `mp_${m.id}`,
        name: m.fullName,
        source: 'manual' as const,
        sortKey: 1000 + i,
      })),
    ];
    return list.sort((a, b) => a.sortKey - b.sortKey);
  }, [active, teacherId, userNames]);

  // Resolve booking user names from the Supabase users table — bookings only
  // store user_id. We batch-fetch the ids we don't already have cached.
  useEffect(() => {
    if (!active || !teacherId) return;
    const sessionId = active.session.id;
    const userIds = bookingsService
      .listForTeacher(teacherId)
      .filter((b) => b.sessionId === sessionId)
      .map((b) => b.userId);
    const missing = userIds.filter((id) => !userNames[id]);
    if (missing.length === 0) return;
    supabase
      .from('users')
      .select('id, name')
      .in('id', missing)
      .then(({ data }) => {
        if (!data) return;
        setUserNames((prev) => {
          const next = { ...prev };
          for (const row of data as Array<{ id: string; name: string }>) {
            next[row.id] = row.name;
          }
          return next;
        });
      });
  }, [active, teacherId, userNames]);

  // Hydrate persisted attendance marks for the active session, and re-render
  // whenever the service notifies (optimistic update + Supabase round-trip).
  useEffect(() => {
    if (!active) return;
    attendanceService.loadForSession(active.session.id).catch(() => {});
    const unsub = attendanceService.onChange(() => setTick((t) => t + 1));
    return unsub;
  }, [active?.session.id]);

  // Resolve attendee id → present? from the persistent service. The local
  // `presence` state still exists (legacy) but is no longer the source of
  // truth — we mirror it so the secondary "present count" stat stays right.
  const isAttendeePresent = (attendeeId: string): boolean => {
    if (!active) return false;
    if (attendeeId.startsWith('bk_')) {
      return attendanceService.isPresent(active.session.id, attendeeId.slice(3), null);
    }
    if (attendeeId.startsWith('mp_')) {
      return attendanceService.isPresent(active.session.id, null, attendeeId.slice(3));
    }
    return false;
  };

  const togglePresence = async (attendeeId: string) => {
    if (!active || !teacherId) return;
    const next = !isAttendeePresent(attendeeId);
    // Optimistic local state — the service also keeps its own optimistic
    // cache so the UI updates instantly even before Supabase responds.
    setPresence((prev) => ({ ...prev, [attendeeId]: next }));
    try {
      await attendanceService.setPresence({
        sessionId: active.session.id,
        teacherId,
        bookingId: attendeeId.startsWith('bk_') ? attendeeId.slice(3) : undefined,
        manualId: attendeeId.startsWith('mp_') ? attendeeId.slice(3) : undefined,
        present: next,
      });
    } catch (e) {
      // Roll back the local mirror on failure.
      setPresence((prev) => ({ ...prev, [attendeeId]: !next }));
      Alert.alert('Erreur', (e as Error).message);
    }
  };

  // Inline "Ajouter un élève" modal — adds a walk-in directly from this
  // screen so the prof never has to bounce to Planning during a class.
  // Persists via `manualParticipantsService.add` (Supabase-backed).
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addNote, setAddNote] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddWalkIn = async () => {
    if (!active || !teacherId) return;
    const trimmedName = addName.trim();
    if (!trimmedName) return;
    const u = authService.getCurrentUser();
    if (!u) {
      Alert.alert('Session expirée', 'Reconnecte-toi pour ajouter un élève.');
      return;
    }
    setAdding(true);
    try {
      await manualParticipantsService.add({
        sessionId: active.session.id,
        teacherId,
        fullName: trimmedName,
        note: addNote.trim() || undefined,
        addedBy: u.id,
      });
      setAddName('');
      setAddNote('');
      setAddOpen(false);
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  // Collective-message modal state — sends the same body to each booked
  // student of the active session via individual conversations (the DB has
  // no "group chat" yet, but the prof gets one-tap fan-out from here).
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  // Recipients = bookings only (manual walk-ins don't have a user_id).
  const bookingRecipients = useMemo(() => {
    if (!active || !teacherId) return [] as Array<{ userId: string }>;
    return bookingsService
      .listForTeacher(teacherId)
      .filter(
        (b) =>
          b.sessionId === active.session.id &&
          (b.status === 'confirmed' || b.status === 'completed'),
      )
      .map((b) => ({ userId: b.userId }));
  }, [active, teacherId]);

  const handleSendCollective = async () => {
    if (!teacherId || !active) return;
    const trimmed = msgBody.trim();
    if (!trimmed) return;
    if (bookingRecipients.length === 0) {
      Alert.alert('Aucun destinataire', 'Aucun élève booké sur cette session.');
      return;
    }
    setMsgSending(true);
    let okCount = 0;
    let failCount = 0;
    for (const r of bookingRecipients) {
      try {
        const conv = await messagingService.getOrCreateConversation(
          r.userId,
          teacherId,
        );
        await messagingService.sendMessage(conv.id, 'teacher', trimmed);
        okCount += 1;
      } catch {
        failCount += 1;
      }
    }
    setMsgSending(false);
    setMsgBody('');
    setMsgOpen(false);
    if (failCount === 0) {
      Alert.alert(
        'Message envoyé ✓',
        `${okCount} élève${okCount > 1 ? 's' : ''} contacté${okCount > 1 ? 's' : ''}.`,
      );
    } else {
      Alert.alert(
        'Envoi partiel',
        `${okCount} envoyé(s), ${failCount} échec(s). Réessaie pour ceux qui n'ont pas reçu.`,
      );
    }
  };

  const presentCount = attendees.filter((a) => isAttendeePresent(a.id)).length;
  const totalCount = attendees.length;
  const sessionStatus = useMemo(() => {
    if (!active) return null;
    const now = Date.now();
    const start = new Date(active.session.startsAt).getTime();
    const end = new Date(active.session.endsAt).getTime();
    if (now < start) return { label: 'À venir', tone: 'pending' as const };
    if (now > end) return { label: 'Terminée', tone: 'past' as const };
    return { label: 'En cours', tone: 'live' as const };
  }, [active]);

  const handleValidate = () => {
    if (!active) return;
    // Each toggle is already persisted via attendanceService.setPresence —
    // this just gives a confirmation summary so the teacher knows the marks
    // were saved end-to-end.
    Alert.alert(
      'Présences enregistrées ✓',
      `${presentCount} présent${presentCount > 1 ? 's' : ''} sur ${totalCount}. Les marques sont sauvegardées.`,
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([
                  bookingsService.load(),
                  teacherId
                    ? manualParticipantsService.loadForTeacher(teacherId)
                    : Promise.resolve(),
                  active ? attendanceService.loadForSession(active.session.id) : Promise.resolve(),
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.proAccent}
          />
        }
      >
        <Text style={styles.title}>Présences</Text>

        {todaysSessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={36} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Aucune session aujourd'hui</Text>
            <Text style={styles.emptyText}>
              Reviens ici les jours où tu as cours pour pointer les présences en un coup d'œil.
            </Text>
          </View>
        ) : (
          <>
            {/* Session selector (only when more than one today) */}
            {todaysSessions.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectorRow}
              >
                {todaysSessions.map(({ session, cls }) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.selectorChip, isActive && styles.selectorChipActive]}
                      onPress={() => setActiveSessionId(session.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.selectorChipText, isActive && styles.selectorChipTextActive]}>
                        {formatTimeLabel(session.startsAt)} · {cls.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {active && (
              <>
                {/* Session card */}
                <View style={styles.sessionCard}>
                  <View style={styles.sessionTopRow}>
                    <Text style={styles.sessionTitle} numberOfLines={2}>
                      {active.cls.title}
                    </Text>
                    {sessionStatus && (
                      <View
                        style={[
                          styles.statusBadge,
                          sessionStatus.tone === 'live' && styles.statusBadgeLive,
                          sessionStatus.tone === 'past' && styles.statusBadgePast,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            sessionStatus.tone === 'live' && styles.statusBadgeTextLive,
                            sessionStatus.tone === 'past' && styles.statusBadgeTextPast,
                          ]}
                        >
                          {sessionStatus.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sessionMeta}>
                    Aujourd'hui · {formatTimeLabel(active.session.startsAt)}
                  </Text>
                  <View style={styles.sessionCountRow}>
                    <Text style={styles.sessionCountValue}>
                      {presentCount}/{totalCount}
                    </Text>
                    <Text style={styles.sessionCountLabel}>
                      présent{presentCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {/* Attendee list */}
                {attendees.length === 0 ? (
                  <View style={styles.emptyAttendees}>
                    <Text style={styles.emptyAttendeesText}>
                      Aucun élève inscrit sur cette session pour le moment.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.list}>
                    {attendees.map((a) => {
                      const present = isAttendeePresent(a.id);
                      return (
                        <TouchableOpacity
                          key={a.id}
                          style={[styles.attendeeRow, present && styles.attendeeRowOn]}
                          onPress={() => togglePresence(a.id)}
                          activeOpacity={0.85}
                        >
                          <View style={[styles.avatar, present && styles.avatarOn]}>
                            <Text style={[styles.avatarInitial, present && styles.avatarInitialOn]}>
                              {a.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.attendeeName}>{a.name}</Text>
                            {a.source === 'manual' && (
                              <Text style={styles.attendeeTag}>Walk-in</Text>
                            )}
                          </View>
                          <View
                            style={[
                              styles.checkBox,
                              present && styles.checkBoxOn,
                            ]}
                          >
                            {present && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Secondary actions — focus on adding a walk-in or sending
                    a quick message. Attendance itself is the tap-to-check
                    list above, no scanner needed. */}
                <View style={styles.secondaryRow}>
                  <SecondaryAction
                    icon="person-add-outline"
                    label="Ajouter un élève"
                    onPress={() => {
                      if (!active) return;
                      setAddName('');
                      setAddNote('');
                      setAddOpen(true);
                    }}
                  />
                  <SecondaryAction
                    icon="chatbubbles-outline"
                    label="Message"
                    onPress={() => setMsgOpen(true)}
                  />
                </View>

                {/* Primary CTA */}
                <TouchableOpacity
                  style={styles.cta}
                  activeOpacity={0.85}
                  onPress={handleValidate}
                  disabled={totalCount === 0}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.ctaText}>Valider les présences</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View style={{ height: spacing.lg }} />
      </ScrollView>

      {/* Add walk-in modal */}
      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.msgBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.msgCard}>
            <View style={styles.msgHeader}>
              <View style={[styles.msgIconWrap, { backgroundColor: 'rgba(232,149,121,0.16)' }]}>
                <Ionicons name="person-add" size={20} color="#E89579" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.msgTitle}>Ajouter un élève</Text>
                <Text style={styles.msgSubtitle} numberOfLines={1}>
                  {active?.cls.title} · {active?.session.startsAt ? formatTimeLabel(active.session.startsAt) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nom complet</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Ex. Camille Bernard"
              placeholderTextColor={colors.textLight}
              value={addName}
              onChangeText={setAddName}
              autoFocus
              autoCapitalize="words"
              maxLength={80}
            />

            <Text style={styles.fieldLabel}>Note (optionnel)</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              placeholder="Ex. cours d'essai, ami invité, walk-in…"
              placeholderTextColor={colors.textLight}
              value={addNote}
              onChangeText={setAddNote}
              multiline
              maxLength={200}
            />

            <Text style={styles.msgFootnote}>
              L'élève est ajouté à cette session uniquement, sans paiement ni facture. Idéal pour les cours d'essai ou les invités.
            </Text>

            <TouchableOpacity
              style={[styles.msgSend, (adding || !addName.trim()) && { opacity: 0.5 }]}
              activeOpacity={0.85}
              onPress={handleAddWalkIn}
              disabled={adding || !addName.trim()}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.msgSendText}>
                {adding ? 'Ajout…' : "Ajouter à la session"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Collective message modal */}
      <Modal
        visible={msgOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMsgOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.msgBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.msgCard}>
            <View style={styles.msgHeader}>
              <View style={styles.msgIconWrap}>
                <Ionicons name="chatbubbles" size={20} color={colors.proAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.msgTitle}>Message collectif</Text>
                <Text style={styles.msgSubtitle} numberOfLines={1}>
                  {bookingRecipients.length} élève{bookingRecipients.length > 1 ? 's' : ''} · {active?.cls.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMsgOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.msgInput}
              placeholder="Écris ton message…"
              placeholderTextColor={colors.textLight}
              multiline
              value={msgBody}
              onChangeText={setMsgBody}
              autoFocus
              maxLength={1000}
            />

            <Text style={styles.msgFootnote}>
              Le message est envoyé en privé à chaque élève booké. Ils peuvent te répondre dans leur messagerie.
            </Text>

            <TouchableOpacity
              style={[
                styles.msgSend,
                (msgSending || !msgBody.trim() || bookingRecipients.length === 0) && { opacity: 0.5 },
              ]}
              activeOpacity={0.85}
              onPress={handleSendCollective}
              disabled={msgSending || !msgBody.trim() || bookingRecipients.length === 0}
            >
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
              <Text style={styles.msgSendText}>
                {msgSending ? 'Envoi…' : `Envoyer à ${bookingRecipients.length}`}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SecondaryAction({
  icon, label, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.secondaryIconWrap}>
        <Ionicons name={icon} size={18} color={colors.proAccent} />
      </View>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.lg,
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Session selector chips
  selectorRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
    marginBottom: spacing.md,
  },
  selectorChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  selectorChipActive: {
    backgroundColor: colors.proAccent,
  },
  selectorChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  selectorChipTextActive: {
    color: '#FFFFFF',
  },

  // Session card
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 4,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(139,126,200,0.14)',
  },
  statusBadgeLive: {
    backgroundColor: 'rgba(67,196,176,0.18)',
  },
  statusBadgePast: {
    backgroundColor: colors.borderLight,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.proAccent,
    letterSpacing: 0.3,
  },
  statusBadgeTextLive: {
    color: colors.primaryDark,
  },
  statusBadgeTextPast: {
    color: colors.textSecondary,
  },
  sessionMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sessionCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: spacing.sm,
  },
  sessionCountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.proAccent,
    letterSpacing: -0.5,
  },
  sessionCountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Empty attendees
  emptyAttendees: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyAttendeesText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Attendee list
  list: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  attendeeRowOn: {
    backgroundColor: 'rgba(67,196,176,0.06)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: {
    backgroundColor: 'rgba(67,196,176,0.20)',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  avatarInitialOn: {
    color: colors.primaryDark,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  attendeeTag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  // Secondary actions row
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    gap: 6,
    ...shadows.sm,
  },
  secondaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,126,200,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.proAccent,
    paddingVertical: 16,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Collective message modal
  msgBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  msgCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 6,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  msgIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139,126,200,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  msgSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  msgInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 120,
    maxHeight: 200,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  // Shared field styles for the "Add walk-in" modal (name + note inputs).
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
  },
  fieldInputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  msgFootnote: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  msgSend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.proAccent,
    paddingVertical: 14,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  msgSendText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
