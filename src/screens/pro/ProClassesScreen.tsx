import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { coursesService } from '../../services/courses.service';
import { ClassOffer } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Badge from '../../components/ui/Badge';
import { teachersService } from '../../services/teachers.service';
import { Alert } from 'react-native';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';

export default function ProClassesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const teacherId = useCurrentTeacherId();
  const [, setTick] = useState(0);
  useEffect(() => coursesService.onChange(() => setTick((t) => t + 1)), []);
  const classes = teacherId ? coursesService.listForTeacher(teacherId) : [];
  const [photosComplete, setPhotosComplete] = useState(
    teacherId ? teachersService.hasCompletePhotos(teacherId) : false,
  );

  // Re-evaluate as soon as teacherId resolves (useCurrentTeacherId is async).
  useEffect(() => {
    if (!teacherId) return;
    setPhotosComplete(teachersService.hasCompletePhotos(teacherId));
    return teachersService.onChange(() => {
      setPhotosComplete(teachersService.hasCompletePhotos(teacherId));
    });
  }, [teacherId]);

  // Also refresh when screen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      if (teacherId) setPhotosComplete(teachersService.hasCompletePhotos(teacherId));
    }, [teacherId]),
  );

  const handleCreate = () => {
    if (!photosComplete) {
      Alert.alert(
        'Photos requises',
        "Tu dois d'abord ajouter 3 photos (lieu, toi, activité) avant de pouvoir créer une offre.",
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Ajouter mes photos',
            onPress: () =>
              navigation.getParent()?.navigate('Paramètres', {
                screen: 'TeacherPhotos',
                initial: false,
              }),
          },
        ]
      );
      return;
    }
    navigation.navigate('CreateClass');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes offres</Text>
        <TouchableOpacity
          style={[styles.addBtn, !photosComplete && styles.addBtnDisabled]}
          onPress={handleCreate}
        >
          <Text style={styles.addBtnText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      {!photosComplete && (
        <TouchableOpacity
          style={styles.warning}
          activeOpacity={0.9}
          onPress={() =>
            navigation.getParent()?.navigate('Paramètres', {
              screen: 'TeacherPhotos',
              initial: false,
            })
          }
        >
          <View style={styles.warningIcon}>
            <Text style={styles.warningIconText}>!</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Photos manquantes</Text>
            <Text style={styles.warningText}>
              Ajoute 3 photos (lieu, toi, activité) pour pouvoir créer des offres.
            </Text>
          </View>
          <Text style={styles.warningArrow}>›</Text>
        </TouchableOpacity>
      )}

      {classes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>Aucune offre créée</Text>
          <Text style={styles.emptyText}>
            Crée ta première offre pour commencer à recevoir des réservations.
          </Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ClassItem
              offer={item}
              onPress={() =>
                navigation.navigate('CreateClass', { offerId: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function ClassItem({ offer, onPress }: { offer: ClassOffer; onPress: () => void }) {
  const sessions = coursesService.getSessions(offer.id);
  const upcomingCount = sessions.length;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <Image source={{ uri: offer.imageUrl }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{offer.title}</Text>
          <Text style={styles.cardPrice}>{offer.price}€</Text>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={offer.category} variant="pro" small />
          <Badge
            label={offer.format === 'individual' ? 'Individuel' : `${offer.maxParticipants} max`}
            variant="neutral"
            small
          />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardStat}>
            {offer.durationMinutes}min · {upcomingCount} session{upcomingCount > 1 ? 's' : ''} à venir
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  addBtn: {
    backgroundColor: colors.proAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    ...shadows.buttonPro,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  addBtnDisabled: { opacity: 0.5 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radii.md,
    gap: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  warningIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIconText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  warningTitle: { fontSize: 13, fontWeight: '700', color: '#8B6D00', marginBottom: 2 },
  warningText: { fontSize: 12, color: '#6B5600', lineHeight: 17 },
  warningArrow: { fontSize: 24, color: '#8B6D00', fontWeight: '300' },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadows.card,
    marginBottom: spacing.md,
  },
  cardImage: { width: 100, height: 130 },
  cardContent: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: colors.proAccent },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  cardFooter: { marginTop: spacing.sm },
  cardStat: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
