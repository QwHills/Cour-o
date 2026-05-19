// Landing screen for organization admins. Surfaces the three operations
// the admin will reach for daily: manage teachers, manage commercial
// products (subscriptions / packs), and create classes. Numbers are light
// for now — phase 3 will plug KPIs from bookings + revenue.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { organizationsService } from '../../services/organizations.service';
import { productsService } from '../../services/products.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Organization } from '../../types/domain';

export default function OrgDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [, setTick] = useState(0);
  const user = authService.getCurrentUser();

  useEffect(() => {
    const u1 = organizationsService.onChange(() => setTick((t) => t + 1));
    const u2 = productsService.onChange(() => setTick((t) => t + 1));
    return () => { u1(); u2(); };
  }, []);

  // Pick the first org the user admins. Multi-org support will need a
  // dedicated picker (phase 3+).
  const memberships = user ? organizationsService.listMembershipsFor(user.id) : [];
  const adminOrg: Organization | undefined = memberships.find((m) => m.role === 'admin')?.org;

  if (!user || !adminOrg) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Chargement de ta structure…</Text>
        </View>
      </View>
    );
  }

  const members = organizationsService.listMembers(adminOrg.id);
  const activeTeachers = members.filter((m) => m.role === 'teacher' && m.joinedAt).length;
  const pendingInvites = members.filter((m) => !m.joinedAt).length;
  const products = productsService.listForOwner(
    { type: 'organization', id: adminOrg.id },
    { onlyActive: true },
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.hello}>Bonjour,</Text>
          <View style={styles.nameRow}>
            <Text style={styles.orgName}>{adminOrg.name}</Text>
          </View>
          <Badge label="Admin" variant="pro" small style={{ marginTop: 6 }} />
        </View>
      </View>

      <LinearGradient
        colors={[colors.proGradientStart, colors.proGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroLabel}>Ta structure sur Koureo</Text>
        <Text style={styles.heroValue}>{adminOrg.name}</Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaValue}>{activeTeachers}</Text>
            <Text style={styles.heroMetaLabel}>professeurs</Text>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaValue}>{products.length}</Text>
            <Text style={styles.heroMetaLabel}>offres actives</Text>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaValue}>{pendingInvites}</Text>
            <Text style={styles.heroMetaLabel}>invites en cours</Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.sectionLabel}>GESTION</Text>

      <ActionCard
        icon="people-outline"
        tint="#7EB5A6"
        bg="#EEF5F2"
        title="Professeurs"
        subtitle={
          activeTeachers === 0
            ? "Invite tes profs par email pour qu'ils animent tes cours."
            : `${activeTeachers} prof${activeTeachers > 1 ? 's' : ''} actif${activeTeachers > 1 ? 's' : ''}${pendingInvites > 0 ? ` · ${pendingInvites} en attente` : ''}`
        }
        onPress={() => navigation.navigate('OrgTeachers')}
      />

      <ActionCard
        icon="card-outline"
        tint="#C9A96E"
        bg="#F8F0DC"
        title="Offres commerciales"
        subtitle={
          products.length === 0
            ? "Crée tes abonnements, packs de crédits ou cours à l'unité."
            : `${products.length} offre${products.length > 1 ? 's' : ''} publiée${products.length > 1 ? 's' : ''}`
        }
        onPress={() => navigation.navigate('OrgProducts')}
      />

      <ActionCard
        icon="grid-outline"
        tint="#8B7EC8"
        bg="#EEEBF7"
        title="Cours & créneaux"
        subtitle="Crée tes cours, assigne un professeur à chaque séance."
        onPress={() => navigation.navigate('OrgClasses')}
      />

      <Card style={styles.soonCard}>
        <Ionicons name="sparkles-outline" size={20} color={colors.textLight} />
        <View style={{ flex: 1 }}>
          <Text style={styles.soonTitle}>Bientôt disponible</Text>
          <Text style={styles.soonText}>
            Paiements aux professeurs, exports financiers, intégration Stripe
            Connect pour ta structure.
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function ActionCard({
  icon,
  tint,
  bg,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.actionArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontSize: 14, color: colors.textSecondary },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  hello: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orgName: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.3 },

  heroCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    ...shadows.buttonPro,
  },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 22, color: '#FFFFFF', fontWeight: '800', marginTop: spacing.xs, letterSpacing: -0.3 },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroMeta: { flex: 1, alignItems: 'center' },
  heroMetaValue: { fontSize: 20, color: '#FFFFFF', fontWeight: '800' },
  heroMetaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2, textAlign: 'center' },
  heroMetaDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  actionArrow: { fontSize: 24, color: colors.textLight, fontWeight: '300' },

  soonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  soonTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  soonText: { fontSize: 12, color: colors.textLight, marginTop: 2, lineHeight: 17 },
});
