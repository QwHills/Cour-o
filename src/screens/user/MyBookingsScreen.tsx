import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bookingsService } from '../../services/bookings.service';
import { coursesService } from '../../services/courses.service';
import { authService } from '../../services/auth.service';
import { Booking } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import { formatFullDate, formatTimeLabel } from '../../utils/date';
import Badge from '../../components/ui/Badge';

type Tab = 'upcoming' | 'past';

export default function MyBookingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const refresh = () => {
      const user = authService.getCurrentUser();
      if (user) {
        setBookings(bookingsService.listForUser(user.id));
      }
    };
    refresh();
    return bookingsService.onChange(refresh);
  }, []);

  const now = Date.now();
  const filtered = bookings.filter((b) => {
    const inFuture = new Date(b.sessionStartsAt).getTime() > now;
    return tab === 'upcoming' ? inFuture : !inFuture;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes cours</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>
            À venir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'past' && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>
            Passés
          </Text>
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color={colors.textLight} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>
            {tab === 'upcoming' ? 'Aucun cours à venir' : 'Aucun cours passé'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'upcoming'
              ? 'Explore les cours autour de toi et réserve ta prochaine expérience !'
              : 'Tes cours terminés apparaîtront ici.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <BookingItem booking={item} onPress={() => {
            if (item.questionnaireRequired && !item.questionnaireCompleted) {
              navigation.navigate('PostClassQuestionnaire', { bookingId: item.id });
            } else {
              navigation.navigate('BookingDetail', { bookingId: item.id });
            }
          }} />}
        />
      )}
    </View>
  );
}

function BookingItem({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const course = coursesService.get(booking.classId);
  if (!course) return null;

  const statusMap: Record<Booking['status'], { variant: 'success' | 'info' | 'neutral' | 'error' | 'warning'; label: string }> = {
    confirmed: { variant: 'success', label: 'Confirmé' },
    refunded: { variant: 'info', label: 'Remboursé' },
    cancelled_by_user: { variant: 'neutral', label: 'Annulé' },
    cancelled_by_pro: { variant: 'error', label: 'Annulé (pro)' },
    completed: { variant: 'neutral', label: 'Terminé' },
    no_show: { variant: 'warning', label: 'No-show' },
  };
  const { variant: statusVariant, label: statusLabel } = statusMap[booking.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: course.class.imageUrl }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{course.class.title}</Text>
          <Badge label={statusLabel} variant={statusVariant} small />
        </View>
        <Text style={styles.cardPro}>avec {course.teacher?.displayName}</Text>
        <View style={styles.cardDetails}>
          <Text style={styles.cardDetail}>📅 {formatFullDate(booking.sessionStartsAt)}</Text>
          <Text style={styles.cardDetail}>🕐 {formatTimeLabel(booking.sessionStartsAt)}</Text>
        </View>
        {booking.questionnaireRequired && !booking.questionnaireCompleted ? (
          <View style={styles.reviewPrompt}>
            <Text style={styles.reviewPromptText}>🌱 À évaluer</Text>
          </View>
        ) : bookingsService.canLeaveReview(booking) ? (
          <View style={styles.reviewOptional}>
            <Text style={styles.reviewOptionalText}>⭐ Donner un avis</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
  },
  tabActive: { backgroundColor: colors.text },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: spacing.md,
  },
  cardImage: { width: 100, height: 100 },
  cardContent: { flex: 1, padding: spacing.md, gap: spacing.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  cardPro: { fontSize: 12, color: colors.textSecondary },
  cardDetails: { marginTop: spacing.xs, gap: 2 },
  cardDetail: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  reviewPrompt: { alignSelf: 'flex-start', backgroundColor: '#FFF8E1', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full, marginTop: spacing.xs },
  reviewPromptText: { fontSize: 10, fontWeight: '700', color: '#8B6D00' },
  reviewOptional: { alignSelf: 'flex-start', backgroundColor: '#EEF5F2', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full, marginTop: spacing.xs },
  reviewOptionalText: { fontSize: 10, fontWeight: '700', color: '#4F8C79' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
