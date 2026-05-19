// Full teacher management for an organization admin :
//   • active members list (teachers + admins + staff)
//   • pending invitations list (no joined_at yet)
//   • inline invite-by-email form (modal sheet)
//   • tap a member → option to revoke

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth.service';
import { organizationsService } from '../../services/organizations.service';
import { supabase } from '../../services/supabase/client';
import {
  OrganizationMember,
  OrganizationMemberRole,
} from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

interface UserLite {
  id: string;
  name: string;
  email: string;
}

const ROLE_LABEL: Record<OrganizationMemberRole, string> = {
  admin: 'Admin',
  teacher: 'Professeur',
  staff: 'Staff',
};

export default function OrgTeachersScreen() {
  const navigation = useNavigation();
  const [, setTick] = useState(0);

  // Track org members changes
  useEffect(() => organizationsService.onChange(() => setTick((t) => t + 1)), []);

  const user = authService.getCurrentUser();
  const memberships = user ? organizationsService.listMembershipsFor(user.id) : [];
  const adminOrg = memberships.find((m) => m.role === 'admin')?.org;

  const members = adminOrg ? organizationsService.listMembers(adminOrg.id) : [];
  const active = members.filter((m) => m.joinedAt);
  const pending = members.filter((m) => !m.joinedAt);

  // Fetch the user profiles referenced by members so we can display names.
  const [userProfiles, setUserProfiles] = useState<Map<string, UserLite>>(new Map());
  useEffect(() => {
    const ids = members.map((m) => m.userId);
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
  }, [members.length, members.map((m) => m.userId).join(',')]);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleRemove = (m: OrganizationMember) => {
    Alert.alert(
      'Retirer ce membre ?',
      "Il ne pourra plus animer de cours ni accéder à la structure.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await organizationsService.removeMember(m.id);
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  if (!adminOrg) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Professeurs</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.empty}>Structure introuvable.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professeurs</Text>
        <TouchableOpacity onPress={() => setInviteOpen(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Inviter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {active.length === 0 && pending.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Personne pour l'instant</Text>
            <Text style={styles.emptyText}>
              Invite tes professeurs par email pour qu'ils animent les cours de {adminOrg.name}.
            </Text>
            <Button
              label="+ Inviter un professeur"
              variant="pro"
              onPress={() => setInviteOpen(true)}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Membres actifs · {active.length}
                </Text>
                {active.map((m) => {
                  const profile = userProfiles.get(m.userId);
                  return (
                    <MemberRow
                      key={m.id}
                      member={m}
                      name={profile?.name ?? 'Utilisateur'}
                      email={profile?.email ?? ''}
                      currentUserId={user?.id}
                      onRemove={() => handleRemove(m)}
                    />
                  );
                })}
              </View>
            )}

            {pending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Invitations en attente · {pending.length}
                </Text>
                {pending.map((m) => {
                  const profile = userProfiles.get(m.userId);
                  return (
                    <MemberRow
                      key={m.id}
                      member={m}
                      name={profile?.name ?? 'Utilisateur'}
                      email={profile?.email ?? ''}
                      currentUserId={user?.id}
                      pending
                      onRemove={() => handleRemove(m)}
                    />
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <InviteModal
        visible={inviteOpen}
        orgId={adminOrg.id}
        onClose={() => setInviteOpen(false)}
      />
    </View>
  );
}

function MemberRow({
  member,
  name,
  email,
  currentUserId,
  pending,
  onRemove,
}: {
  member: OrganizationMember;
  name: string;
  email: string;
  currentUserId?: string;
  pending?: boolean;
  onRemove: () => void;
}) {
  const isMe = member.userId === currentUserId;
  const initial = (name || email || '?').slice(0, 1).toUpperCase();
  return (
    <Card style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
            {isMe && <Text style={styles.youTag}> · toi</Text>}
          </Text>
          <Badge
            label={ROLE_LABEL[member.role]}
            variant={member.role === 'admin' ? 'pro' : 'neutral'}
            small
          />
        </View>
        <Text style={styles.email} numberOfLines={1}>{email}</Text>
        {pending && (
          <Text style={styles.pendingHint}>
            Invitation envoyée — en attente d'acceptation
          </Text>
        )}
      </View>
      {!isMe && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Ionicons name="close-circle-outline" size={22} color={colors.error} />
        </TouchableOpacity>
      )}
    </Card>
  );
}

function InviteModal({
  visible,
  orgId,
  onClose,
}: {
  visible: boolean;
  orgId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationMemberRole>('teacher');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Email invalide', 'Renseigne un email valide.');
      return;
    }
    setLoading(true);
    try {
      await organizationsService.inviteByEmail(orgId, email.trim().toLowerCase(), role);
      Alert.alert(
        'Invitation envoyée ✓',
        `${email} a reçu une invitation. Il faut qu'il accepte depuis son compte pour rejoindre la structure.`,
      );
      setEmail('');
      setRole('teacher');
      setTimeout(onClose, 300);
    } catch (e: any) {
      Alert.alert('Invitation impossible', e.message);
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
          <Text style={styles.modalTitle}>Inviter un membre</Text>
          <Text style={styles.modalSubtitle}>
            L'utilisateur doit déjà avoir un compte Koureo. Il recevra une invitation à accepter.
          </Text>

          <Input
            label="Email du membre"
            placeholder="prof@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.roleLabel}>Rôle</Text>
          <View style={styles.roleRow}>
            {(['teacher', 'admin', 'staff'] as OrganizationMemberRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    role === r && styles.roleChipTextActive,
                  ]}
                >
                  {ROLE_LABEL[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            label={loading ? 'Envoi…' : 'Envoyer l\'invitation'}
            variant="pro"
            loading={loading}
            onPress={handleInvite}
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

  emptyState: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xxl, gap: spacing.sm },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  youTag: { fontWeight: '400', color: colors.textLight, fontSize: 12 },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pendingHint: { fontSize: 11, fontStyle: 'italic', color: colors.warning, marginTop: 4 },
  removeBtn: { padding: spacing.sm },

  // Invite modal
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
  roleLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  roleChipActive: { backgroundColor: colors.proAccent, borderColor: colors.proAccent },
  roleChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  roleChipTextActive: { color: '#FFFFFF' },
  cancelLink: { paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  cancelLinkText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
});
