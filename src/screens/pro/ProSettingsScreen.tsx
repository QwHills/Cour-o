import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { formatCommissionLabel } from '../../services/commission.service';
import { useCommission } from '../../hooks/useCommission';
import { teachersService } from '../../services/teachers.service';
import { getTeacherById } from '../../data/mockTeachers';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';

function computePhotosState() {
  const t = getTeacherById(DEMO_TEACHER_ID);
  const p = t?.photos ?? {};
  const count = [p.place, p.self, p.activity].filter(Boolean).length;
  return { photosCount: count, photosComplete: count === 3 };
}

export default function ProSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [photosState, setPhotosState] = useState(computePhotosState());
  const { photosCount, photosComplete } = photosState;
  const commission = useCommission();

  useEffect(() => {
    return teachersService.onChange(() => setPhotosState(computePhotosState()));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setPhotosState(computePhotosState());
    }, [])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Paramètres</Text>

      <Card style={styles.block} padding="none">
        <SectionHeader title="Compte" />
        <MenuRow
          icon="person-outline"
          label="Mon profil pro"
          sub="Nom, bio, catégories"
          onPress={() => navigation.navigate('ProEditProfile')}
        />
        <MenuRow
          icon="camera-outline"
          label="Mes photos"
          sub={photosComplete ? '3/3 photos ajoutées ✓' : `${photosCount}/3 photos · requis pour créer`}
          onPress={() => navigation.navigate('TeacherPhotos')}
        />
        <MenuRow
          icon="location-outline"
          label="Adresse et zone"
          sub="Lieu des cours & rayon de déplacement"
          onPress={() => navigation.navigate('AddressZone')}
          isLast
        />
      </Card>

      <Card style={styles.block} padding="none">
        <SectionHeader title="Agenda & disponibilités" />
        <MenuRow
          icon="calendar-outline"
          label="Synchroniser agenda"
          sub="Google Calendar"
          onPress={() => navigation.navigate('CalendarSync')}
        />
        <MenuRow
          icon="time-outline"
          label="Horaires d'ouverture"
          sub="Lundi – Samedi"
          onPress={() => navigation.navigate('OpeningHours')}
        />
        <MenuRow
          icon="calendar-clear-outline"
          label="Jours de fermeture"
          sub="Vacances & absences"
          onPress={() => navigation.navigate('ClosedDays')}
          isLast
        />
      </Card>

      <Card style={styles.block} padding="none">
        <SectionHeader title="Paiements & commission" />
        <MenuRow
          icon="card-outline"
          label="Compte Stripe"
          sub="Non connecté"
          onPress={() => navigation.navigate('StripeAccount')}
        />
        <MenuRow
          icon="stats-chart-outline"
          label="Commission plateforme"
          sub={`${formatCommissionLabel(commission)} sur chaque réservation`}
          onPress={() => navigation.navigate('CommissionInfo')}
        />
        <MenuRow
          icon="receipt-outline"
          label="Facturation & TVA"
          sub="Régime TVA, mentions légales"
          onPress={() => navigation.navigate('VatSettings')}
        />
        <MenuRow
          icon="document-outline"
          label="Mes factures"
          sub="Factures auto-générées"
          onPress={() => navigation.navigate('Invoices')}
          isLast
        />
      </Card>

      <Card style={styles.block} padding="none">
        <SectionHeader title="Politique" />
        <MenuRow
          icon="shield-checkmark-outline"
          label="Politique d'annulation"
          sub="48h avant le cours"
          onPress={() => navigation.navigate('CancellationPolicy')}
        />
        <MenuRow
          icon="document-text-outline"
          label="CGV"
          onPress={() => navigation.navigate('CGV')}
          isLast
        />
      </Card>

      <TouchableOpacity
        style={styles.searchCourseCard}
        activeOpacity={0.85}
        onPress={() => authService.switchRole('user')}
      >
        <View style={styles.searchCourseIcon}>
          <Ionicons name="search-outline" size={22} color={colors.proAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.searchCourseTitle}>Rechercher un cours</Text>
          <Text style={styles.searchCourseSub}>
            Explore l'app côté élève — pratique pour réserver un cours ou voir
            comment tes participants te perçoivent.
          </Text>
        </View>
        <Text style={styles.searchCourseChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => {
          authService.signOut().catch((e) =>
            console.warn('signOut failed:', (e as Error).message),
          );
        }}
      >
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuRow({
  icon,
  label,
  sub,
  isLast,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={colors.proAccent} style={styles.icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.lg, letterSpacing: -0.3 },
  block: { marginBottom: spacing.md, overflow: 'hidden' },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { fontSize: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textLight },
  searchCourseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: 0,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.proAccent + '33', // ~20% opacity tint
    ...shadows.card,
  },
  searchCourseIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.proAccent + '14', // ~8% tint
    alignItems: 'center', justifyContent: 'center',
  },
  searchCourseTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  searchCourseSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  searchCourseChevron: { fontSize: 22, color: colors.proAccent, fontWeight: '600' },
  signOutBtn: {
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: colors.error },
});
