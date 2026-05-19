import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import TeacherBadge from '../../components/TeacherBadge';
import { TeacherStatus, TeacherProfile } from '../../types/domain';
import { authService } from '../../services/auth.service';
import {
  messagingService,
  Conversation,
  Message,
} from '../../services/messaging.service';
import { teachersService } from '../../services/teachers.service';
import { coursesService } from '../../services/courses.service';
import { offerSuggestionsService, OfferSuggestionRow } from '../../services/offerSuggestions.service';
import { formatTimeLabel, formatDateLabel } from '../../utils/date';

interface EnrichedConversation {
  id: string;
  raw: Conversation;
  teacher: TeacherProfile | undefined;
  courseName: string;
  courseDate: string;
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTimeLabel(iso);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return formatDateLabel(iso);
}

export default function UserMessagesScreen() {
  const navigation = useNavigation();
  const user = authService.getCurrentUser();
  const [selectedConv, setSelectedConv] = useState<EnrichedConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [, setTick] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubConv = messagingService.onChange(() => setTick((t) => t + 1));
    // Force a reload in case cache is stale
    messagingService.loadConversations().catch(() => {});
    return unsubConv;
  }, []);

  const enriched: EnrichedConversation[] = useMemo(() => {
    if (!user) return [];
    return messagingService.listForUser(user.id).map((c) => {
      const teacher = teachersService.getCached(c.teacherId);
      const cls = c.classId ? coursesService.getClass(c.classId) : undefined;
      return {
        id: c.id,
        raw: c,
        teacher,
        courseName: cls?.title ?? 'Conversation',
        courseDate: cls
          ? ''
          : '',
      };
    });
  }, [user?.id, user]);

  const filtered = search
    ? enriched.filter(
        (c) =>
          (c.teacher?.displayName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          c.courseName.toLowerCase().includes(search.toLowerCase())
      )
    : enriched;

  if (selectedConv) {
    return (
      <ConversationView
        conv={selectedConv}
        newMessage={newMessage}
        onChangeMessage={setNewMessage}
        onBack={() => setSelectedConv(null)}
        sending={sending}
        onSend={async () => {
          const body = newMessage.trim();
          if (!body || !user) return;
          setSending(true);
          try {
            await messagingService.sendMessage(selectedConv.id, 'user', body);
            setNewMessage('');
            // Ensure the user side is marked read on their own outgoing messages
            await messagingService.markRead(selectedConv.id, 'user');
          } catch (e) {
            // Fail silently — the send failure will show in logs
          } finally {
            setSending(false);
          }
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Moderation notice */}
      <View style={styles.moderationBanner}>
        <View style={styles.moderationIcon}>
          <Text style={styles.moderationIconText}>◆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.moderationTitle}>Messagerie sécurisée</Text>
          <Text style={styles.moderationText}>
            Tous les échanges transitent par Koureo. Les coordonnées personnelles sont automatiquement masquées.
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un professeur…"
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Aucun message</Text>
          <Text style={styles.emptyText}>
            Tu pourras contacter tes professeurs après avoir réservé un cours.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ConversationRow
              conv={item}
              onPress={async () => {
                setSelectedConv(item);
                await messagingService.loadMessages(item.id);
                if (item.raw.unreadUser) {
                  messagingService.markRead(item.id, 'user').catch(() => {});
                }
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function ConversationRow({
  conv,
  onPress,
}: {
  conv: EnrichedConversation;
  onPress: () => void;
}) {
  const messages = messagingService.listMessages(conv.id);
  const last = messages[messages.length - 1];
  const unread = conv.raw.unreadUser;
  return (
    <TouchableOpacity style={styles.convRow} activeOpacity={0.9} onPress={onPress}>
      {conv.teacher?.photoUrl ? (
        <Image source={{ uri: conv.teacher.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarFallbackText}>
            {(conv.teacher?.displayName ?? '?').charAt(0)}
          </Text>
        </View>
      )}
      <View style={styles.convContent}>
        <View style={styles.convTop}>
          <View style={styles.nameRow}>
            <Text style={[styles.convName, unread && styles.convNameUnread]}>
              {conv.teacher?.displayName ?? 'Professeur'}
            </Text>
            {conv.teacher?.status && (
              <TeacherBadge status={conv.teacher.status} small />
            )}
          </View>
          <Text style={styles.convTime}>
            {last ? formatShort(last.createdAt) : formatShort(conv.raw.lastMessageAt)}
          </Text>
        </View>
        <Text style={styles.convCourse}>{conv.courseName}</Text>
        <Text
          style={[styles.convMessage, unread && styles.convMessageUnread]}
          numberOfLines={1}
        >
          {last?.body ?? '(pas encore de message)'}
        </Text>
      </View>
      {unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function ConversationView({
  conv,
  newMessage,
  onChangeMessage,
  onBack,
  onSend,
  sending,
}: {
  conv: EnrichedConversation;
  newMessage: string;
  onChangeMessage: (t: string) => void;
  onBack: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  const navigation = useNavigation<any>();
  const [, setTick] = useState(0);
  useEffect(() => messagingService.onChange(() => setTick((t) => t + 1)), []);
  const messages: Message[] = messagingService.listMessages(conv.id);

  // Load offer suggestions linked to this (user, teacher) conversation so
  // we can render a "Découvrir les offres" CTA below the matching message.
  const [suggestionsByMessageId, setSuggestionsByMessageId] = useState<
    Map<string, OfferSuggestionRow>
  >(new Map());
  useEffect(() => {
    if (!conv.teacher?.id) return;
    let cancelled = false;
    offerSuggestionsService
      .listForConversation(conv.raw.userId, conv.teacher.id)
      .then((list) => {
        if (cancelled) return;
        const map = new Map<string, OfferSuggestionRow>();
        list.forEach((s) => {
          if (s.messageId) map.set(s.messageId, s);
        });
        setSuggestionsByMessageId(map);
      });
    return () => { cancelled = true; };
  }, [conv.id, conv.teacher?.id, conv.raw.userId, messages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.convHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.convHeaderInfo}>
          {conv.teacher?.photoUrl ? (
            <Image source={{ uri: conv.teacher.photoUrl }} style={styles.convHeaderAvatar} />
          ) : (
            <View style={[styles.convHeaderAvatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {(conv.teacher?.displayName ?? '?').charAt(0)}
              </Text>
            </View>
          )}
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.convHeaderName}>
                {conv.teacher?.displayName ?? 'Professeur'}
              </Text>
              {conv.teacher?.status && (
                <TeacherBadge status={conv.teacher.status} small />
              )}
            </View>
            <Text style={styles.convHeaderCourse}>{conv.courseName}</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.convModBanner}>
        <Text style={styles.convModText}>
          ◆ Messagerie modérée par Koureo · Pas d'échange de coordonnées
        </Text>
      </View>

      <ScrollView
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 && (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              Démarre la conversation — présente-toi ou pose une question au prof.
            </Text>
          </View>
        )}
        {messages.map((msg) => {
          if (msg.senderRole === 'system') {
            return (
              <View key={msg.id} style={styles.systemMsg}>
                <Text style={styles.systemMsgText}>{msg.body}</Text>
              </View>
            );
          }
          const isMe = msg.senderRole === 'user';
          const suggestion = suggestionsByMessageId.get(msg.id);
          return (
            <View key={msg.id} style={[styles.msgRow, isMe && styles.msgRowMe]}>
              <View
                style={[
                  styles.msgBubble,
                  isMe ? styles.msgBubbleMe : styles.msgBubbleThem,
                ]}
              >
                <Text style={[styles.msgText, isMe && styles.msgTextMe]}>
                  {msg.body}
                </Text>
                {suggestion && conv.teacher && (
                  <TouchableOpacity
                    style={styles.suggestionCta}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('TeacherProfile', {
                        teacherId: suggestion.teacherId,
                      })
                    }
                  >
                    <Text style={styles.suggestionCtaText}>
                      ✨ Découvrir les offres de {conv.teacher.displayName.split(' ')[0]}
                    </Text>
                    <Text style={styles.suggestionCtaChevron}>›</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.msgTime}>{formatShort(msg.createdAt)}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.msgInput}
          placeholder="Écrire un message…"
          placeholderTextColor={colors.textLight}
          value={newMessage}
          onChangeText={onChangeMessage}
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!newMessage.trim() || sending) && styles.sendBtnDisabled,
          ]}
          onPress={onSend}
          disabled={!newMessage.trim() || sending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
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

  moderationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.md,
  },
  moderationIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moderationIconText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  moderationTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  moderationText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  searchBar: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },

  list: { paddingHorizontal: spacing.lg },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  convContent: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  convName: { fontSize: 15, fontWeight: '600', color: colors.text },
  convNameUnread: { fontWeight: '700' },
  convTime: { fontSize: 12, color: colors.textLight },
  convCourse: { fontSize: 11, color: colors.textLight, marginTop: 1, letterSpacing: 0.3 },
  convMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  convMessageUnread: { color: colors.text, fontWeight: '500' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, color: colors.textLight, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  emptyChat: { padding: spacing.xl, alignItems: 'center' },
  emptyChatText: { fontSize: 13, color: colors.textLight, textAlign: 'center' },

  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  convHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  convHeaderAvatar: { width: 36, height: 36, borderRadius: 18 },
  convHeaderName: { fontSize: 15, fontWeight: '700', color: colors.text },
  convHeaderCourse: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  convModBanner: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  convModText: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  messagesScroll: { flex: 1 },
  messagesContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  msgRow: { alignItems: 'flex-start', gap: 4 },
  msgRowMe: { alignItems: 'flex-end' },
  msgBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  msgBubbleThem: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 4,
    ...shadows.sm,
  },
  msgBubbleMe: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
  },
  msgText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  msgTextMe: { color: '#FFFFFF' },
  msgTime: { fontSize: 10, color: colors.textLight, marginTop: 2 },

  suggestionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  suggestionCtaText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700', flex: 1 },
  suggestionCtaChevron: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },

  systemMsg: { alignItems: 'center', paddingVertical: spacing.sm },
  systemMsgText: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
    maxWidth: '80%',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  msgInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.borderLight },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
