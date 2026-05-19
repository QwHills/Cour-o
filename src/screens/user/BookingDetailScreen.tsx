import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bookingsService } from '../../services/bookings.service';
import { coursesService } from '../../services/courses.service';
import { paymentsService } from '../../services/payments.service';
import { authService } from '../../services/auth.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import CancellationNotice from '../../components/CancellationNotice';
import { formatFullDate, formatTimeLabel, hoursUntil } from '../../utils/date';

export default function BookingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(bookingsService.get(bookingId));
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  if (!booking) return <View style={styles.container} />;

  const course = coursesService.get(booking.classId);
  if (!course || !course.teacher) return null;

  const cancelCheck = bookingsService.canCancel(booking);
  const hrs = hoursUntil(booking.sessionStartsAt);

  const handleCancel = () => {
    Alert.alert(
      'Annuler la réservation',
      'Es-tu sûr de vouloir annuler ? Le remboursement sera immédiat.',
      [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await bookingsService.cancelBooking(bookingId);
              setBooking(updated);
              Alert.alert('Annulée', 'Ta réservation a été annulée et remboursée.');
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 140 }}>
        <Image source={{ uri: course.class.imageUrl }} style={styles.cover} />

        <View style={styles.content}>
          <Badge label={course.class.category} variant="primary" />
          <Text style={styles.title}>{course.class.title}</Text>
          <Text style={styles.proName}>avec {course.teacher.displayName}</Text>

          <Card style={styles.block}>
            <InfoRow icon="calendar-outline" label="Date" value={formatFullDate(booking.sessionStartsAt)} />
            <InfoRow icon="time-outline" label="Heure" value={formatTimeLabel(booking.sessionStartsAt)} />
            <InfoRow icon="location-outline" label="Adresse exacte" value={course.teacher.address} />
            <InfoRow icon="card-outline" label="Payé" value={`${booking.priceTotal.toFixed(2)}€`} />
          </Card>

          {/* Contact teacher */}
          {booking.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.contactCard}
              activeOpacity={0.9}
              onPress={() =>
                navigation.getParent()?.navigate('Profil', {
                  screen: 'UserMessages',
                  initial: false,
                })
              }
            >
              <Image
                source={{ uri: course.teacher.photoUrl }}
                style={styles.contactAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>
                  Une question pour {course.teacher.displayName} ?
                </Text>
                <Text style={styles.contactHint}>
                  Envoie-lui un message via Koureo
                </Text>
              </View>
              <View style={styles.contactBtn}>
                <Text style={styles.contactBtnText}>○</Text>
              </View>
            </TouchableOpacity>
          )}

          <Card style={styles.block}>
            <Text style={styles.blockTitle}>Statut</Text>
            <Badge
              label={
                booking.status === 'confirmed'
                  ? 'Confirmé'
                  : booking.status === 'refunded'
                    ? 'Remboursé'
                    : 'Annulé'
              }
              variant={
                booking.status === 'confirmed'
                  ? 'success'
                  : booking.status === 'refunded'
                    ? 'info'
                    : 'neutral'
              }
            />
            {booking.status === 'confirmed' && (
              <Text style={styles.deadline}>
                {hrs > 48
                  ? `Annulation possible pendant encore ${Math.floor(hrs - 48)}h`
                  : hrs > 0
                    ? `⚠️ Plus que ${Math.floor(hrs)}h avant le cours — annulation non remboursable`
                    : 'Cours en cours ou passé'}
              </Text>
            )}
          </Card>

          <View style={styles.block}>
            <CancellationNotice hoursBefore={course.class.cancellationHoursBefore} />
          </View>

          {/* Payment escrow info — for paid past courses */}
          {!booking.isFree && hrs <= 0 && (
            <Card style={styles.block}>
              <Text style={styles.blockTitle}>Paiement</Text>
              <View style={styles.escrowRow}>
                <Text style={styles.escrowIcon}>🔒</Text>
                <Text style={styles.escrowText}>
                  Ton paiement de {booking.priceTotal.toFixed(2)}€ est sécurisé par Koureo.
                  Il sera versé au professeur 24h après le cours, sauf si tu signales un problème.
                </Text>
              </View>
            </Card>
          )}

          {/* Dispute form */}
          {!booking.isFree && hrs <= 0 && !showDisputeForm && (
            <TouchableOpacity
              style={styles.disputeLink}
              onPress={() => setShowDisputeForm(true)}
            >
              <Text style={styles.disputeLinkText}>⚠️ Signaler un problème</Text>
            </TouchableOpacity>
          )}

          {showDisputeForm && (
            <Card style={styles.disputeCard}>
              <Text style={styles.disputeTitle}>Signaler un problème</Text>
              <Text style={styles.disputeHint}>
                Décris le problème rencontré. Ton paiement sera gelé le temps de la médiation.
              </Text>
              <Input
                label="Motif"
                placeholder="Cours annulé, non conforme, professeur absent…"
                value={disputeReason}
                onChangeText={setDisputeReason}
              />
              <Input
                label="Description"
                placeholder="Décris ce qui s'est passé…"
                value={disputeDesc}
                onChangeText={setDisputeDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
              <Button
                label={disputeLoading ? 'Envoi…' : 'Envoyer le signalement'}
                variant="secondary"
                loading={disputeLoading}
                disabled={!disputeReason}
                onPress={async () => {
                  const user = authService.getCurrentUser();
                  if (!user) return;
                  setDisputeLoading(true);
                  try {
                    await paymentsService.openDispute({
                      bookingId: booking.id,
                      userId: user.id,
                      teacherId: booking.teacherId,
                      reason: disputeReason,
                      description: disputeDesc,
                    });
                    Alert.alert(
                      'Signalement envoyé',
                      "Ton paiement est gelé. L'équipe Koureo va étudier ta demande sous 48h.",
                      [{ text: 'OK', onPress: () => setShowDisputeForm(false) }]
                    );
                  } catch (e: any) {
                    Alert.alert('Erreur', e.message);
                  } finally {
                    setDisputeLoading(false);
                  }
                }}
              />
            </Card>
          )}
        </View>
      </ScrollView>

      {(booking.status === 'confirmed' || booking.status === 'completed') && (
        <View style={styles.bottom}>
          {bookingsService.canLeaveReview(booking) ? (
            /* Cours passé, éligible à un avis (obligatoire ou optionnel) */
            <Button
              label={
                booking.questionnaireRequired
                  ? 'Évaluer le professeur'
                  : 'Donner mon avis'
              }
              icon="⭐"
              onPress={() => navigation.navigate('PostClassQuestionnaire', { bookingId: booking.id })}
            />
          ) : cancelCheck.allowed ? (
            /* Annulation possible */
            <Button
              label="Annuler la réservation"
              onPress={handleCancel}
            />
          ) : hrs > 0 ? (
            /* Cours à venir, annulation impossible */
            <>
              <Button
                label="Annulation impossible"
                onPress={() => {}}
                variant="secondary"
                disabled
              />
              {cancelCheck.reason && (
                <Text style={styles.hint}>{cancelCheck.reason}</Text>
              )}
            </>
          ) : null}
        </View>
      )}
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
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
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
  back: { fontSize: 22, color: colors.text, width: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  cover: { width: '100%', height: 200, resizeMode: 'cover' },
  content: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: spacing.sm, letterSpacing: -0.3 },
  proName: { fontSize: 14, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.lg },
  block: { marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  infoIcon: { fontSize: 20 },
  infoLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  blockTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  deadline: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm, fontWeight: '500' },
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
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  escrowRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  escrowIcon: { fontSize: 18, marginTop: 2 },
  escrowText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  disputeLink: { alignItems: 'center', paddingVertical: spacing.md },
  disputeLinkText: { fontSize: 14, fontWeight: '600', color: colors.error },
  disputeCard: { marginBottom: spacing.md, backgroundColor: colors.errorLight, borderWidth: 1, borderColor: 'rgba(199,95,74,0.2)' },
  disputeTitle: { fontSize: 16, fontWeight: '700', color: colors.error, marginBottom: spacing.xs },
  disputeHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  contactAvatar: { width: 48, height: 48, borderRadius: 24 },
  contactTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  contactHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
