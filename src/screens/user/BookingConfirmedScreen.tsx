import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { bookingsService } from '../../services/bookings.service';
import { coursesService } from '../../services/courses.service';
import { colors, spacing, radii } from '../../theme/theme';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { formatFullDate, formatTimeLabel } from '../../utils/date';
import { Booking } from '../../types/domain';

// Google Calendar "add event" URL. Works on iOS, Android and web — opens the
// native Google Calendar app if installed, or the web version otherwise. No
// permission required, no native package needed.
function buildGoogleCalendarUrl(opts: {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  description?: string;
}): string {
  const fmt = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(opts.startsAt)}/${fmt(opts.endsAt)}`,
    ...(opts.location ? { location: opts.location } : {}),
    ...(opts.description ? { details: opts.description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function BookingConfirmedScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const singleId: string | undefined = route.params.bookingId;
  const multiIds: string[] | undefined = route.params.bookingIds;

  // Prefer the full list when it's provided (multi-slot checkout), fall back
  // to the single bookingId otherwise.
  const bookingIds = multiIds && multiIds.length > 0 ? multiIds : singleId ? [singleId] : [];
  const bookings: Booking[] = bookingIds
    .map((id) => bookingsService.get(id))
    .filter((b): b is Booking => !!b);

  const firstBooking = bookings[0];
  const course = firstBooking ? coursesService.get(firstBooking.classId) : null;

  if (!firstBooking || !course) return <View style={styles.container} />;

  const multi = bookings.length > 1;
  const totalPaid = bookings.reduce((sum, b) => sum + b.priceTotal, 0);

  const handleAddToCalendar = (booking: Booking) => {
    if (!course.teacher) return;
    const url = buildGoogleCalendarUrl({
      title: `${course.class.title} avec ${course.teacher.displayName}`,
      startsAt: booking.sessionStartsAt,
      endsAt: new Date(
        new Date(booking.sessionStartsAt).getTime() +
          course.class.durationMinutes * 60_000,
      ).toISOString(),
      location: course.teacher.address,
      description: `Cours Koureo · ${course.class.durationMinutes} min\nPayé : ${booking.priceTotal.toFixed(2)}€`,
    });
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Impossible d\'ouvrir l\'agenda',
        "Essaie d'ouvrir le lien manuellement dans ton navigateur.",
      );
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.hero}
      >
        <View style={styles.checkCircle}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.heroTitle}>
          {multi
            ? `${bookings.length} réservations confirmées !`
            : 'Réservation confirmée !'}
        </Text>
        <Text style={styles.heroSubtitle}>
          Un email de confirmation vient d'être envoyé
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        <Card style={styles.card}>
          <Text style={styles.classTitle}>{course.class.title}</Text>
          <Text style={styles.proName}>avec {course.teacher?.displayName}</Text>

          <View style={styles.divider} />

          {bookings.map((b, idx) => (
            <View
              key={b.id}
              style={[
                styles.sessionBlock,
                idx < bookings.length - 1 && styles.sessionBlockSep,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionLabel}>
                  {multi ? `Séance ${idx + 1}` : 'Séance'}
                </Text>
                <Text style={styles.sessionDate}>
                  {formatFullDate(b.sessionStartsAt)} · {formatTimeLabel(b.sessionStartsAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addCalBtn}
                onPress={() => handleAddToCalendar(b)}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.addCalBtnText}>Agenda</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.divider} />

          <InfoRow
            icon="location-outline"
            label="Adresse exacte"
            value={course.teacher?.address ?? ''}
          />
          <InfoRow
            icon="card-outline"
            label={multi ? `Payé (${bookings.length} séances)` : 'Payé'}
            value={`${totalPaid.toFixed(2)}€`}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Rappel</Text>
          <Text style={styles.cardText}>
            Tu peux annuler une réservation jusqu'à 48h avant le cours avec
            remboursement intégral.
          </Text>
        </Card>

        <TouchableOpacity
          style={styles.contactBtn}
          activeOpacity={0.9}
          onPress={() =>
            navigation.getParent()?.navigate('Profil', {
              screen: 'UserMessages',
              initial: false,
            })
          }
        >
          <Text style={styles.contactBtnText}>
            Envoyer un message à {course.teacher?.displayName}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label="Voir mes réservations"
          onPress={() => {
            navigation.getParent()?.navigate('Mes cours');
          }}
        />
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingTop: 90,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  check: { fontSize: 48, color: '#FFFFFF', fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: spacing.xs, textAlign: 'center' },
  content: { flex: 1, padding: spacing.lg },
  card: { marginBottom: spacing.md },
  classTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  proName: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  sessionBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  sessionBlockSep: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sessionLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionDate: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  addCalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  addCalBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  infoIcon: { fontSize: 22 },
  infoLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  cardText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  contactBtn: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
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
});
