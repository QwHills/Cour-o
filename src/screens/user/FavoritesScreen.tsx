import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { favoritesService } from '../../services/favorites.service';
import { authService } from '../../services/auth.service';
import { coursesService, EnrichedCourse } from '../../services/courses.service';
import { locationService } from '../../services/location.service';
import { userPreferencesService } from '../../services/userPreferences.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import FavoriteButton from '../../components/FavoriteButton';
import TeacherBadge from '../../components/TeacherBadge';
import { formatDateLabel, formatTimeLabel } from '../../utils/date';
import { publicTeacherName } from '../../utils/teacherName';
import { getCategoryColor } from '../../utils/categoryIcons';

export default function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const user = authService.getCurrentUser();
  const [favIds, setFavIds] = useState<string[]>(
    user ? favoritesService.list(user.id) : []
  );

  const [, setTick] = useState(0);
  useEffect(() => {
    return favoritesService.onChange(() => {
      if (user) setFavIds(favoritesService.list(user.id));
    });
  }, [user]);
  useEffect(() => coursesService.onChange(() => setTick((t) => t + 1)), []);

  // Discovery radius from user prefs — drops favorites too far from where
  // the student lives (configurable in Profil → Rayon de recherche).
  const [radii, setRadii] = useState(userPreferencesService.get());
  useEffect(() => {
    const unsub = userPreferencesService.onChange(setRadii);
    userPreferencesService.hydrate().then(setRadii);
    return unsub;
  }, []);
  // Also re-render when geoloc resolves so the distance gate kicks in.
  const [userResolved, setUserResolved] = useState(locationService.getCurrent().resolved);
  useEffect(() => {
    return locationService.onChange((c) => setUserResolved(c.resolved));
  }, []);

  const allFavorites: EnrichedCourse[] = favIds
    .map((id) => coursesService.get(id))
    .filter((c): c is EnrichedCourse => c !== null);

  // If location resolved, hide favorites further than the configured radius.
  // If not resolved yet, show all so we never look empty during the prompt.
  const courses: EnrichedCourse[] = userResolved
    ? allFavorites.filter((c) => c.distanceMeters <= radii.favoritesKm * 1000)
    : allFavorites;
  const hiddenCount = allFavorites.length - courses.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes favoris</Text>
      </View>

      {courses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyHeart}>♡</Text>
          {hiddenCount > 0 ? (
            <>
              <Text style={styles.emptyTitle}>
                {hiddenCount} favori{hiddenCount > 1 ? 's' : ''} hors du rayon
              </Text>
              <Text style={styles.emptyText}>
                Tes favoris sont à plus de {radii.favoritesKm} km. Élargis le rayon dans Profil → Rayon de recherche.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() =>
                  // DiscoveryRadius vit dans le ProfileStack — depuis le tab
                  // Favoris on remonte au parent pour y plonger.
                  navigation.getParent()?.navigate('Profil', {
                    screen: 'DiscoveryRadius',
                    initial: false,
                  })
                }
              >
                <Text style={styles.exploreBtnText}>Modifier le rayon</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>
              <Text style={styles.emptyText}>
                Appuie sur le cœur d'un cours pour le sauvegarder ici et le retrouver facilement.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.getParent()?.navigate('Explorer')}
              >
                <Text style={styles.exploreBtnText}>Explorer les cours</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.count}>
            {courses.length} cours favori{courses.length > 1 ? 's' : ''}
            {hiddenCount > 0 ? ` · ${hiddenCount} hors rayon` : ''}
          </Text>
          {courses.map((course) => (
            <FavoriteCard
              key={course.class.id}
              course={course}
              onPress={() =>
                navigation.getParent()?.navigate('Explorer', {
                  screen: 'CourseDetail',
                  initial: false,
                  params: { courseId: course.class.id },
                })
              }
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

function FavoriteCard({
  course,
  onPress,
}: {
  course: EnrichedCourse;
  onPress: () => void;
}) {
  const { class: cls, teacher, nextSession, distanceLabel } = course;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: cls.imageUrl }} style={styles.cardImage} />
      <View style={[styles.catDot, { backgroundColor: getCategoryColor(cls.category) }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{cls.title}</Text>
          {teacher && <TeacherBadge status={teacher.status} small />}
        </View>
        {teacher && (
          <Text style={styles.cardTeacher}>avec {publicTeacherName(teacher)}</Text>
        )}
        <View style={styles.cardMeta}>
          {nextSession && (
            <Text style={styles.cardMetaText}>
              {formatDateLabel(nextSession.startsAt)} · {formatTimeLabel(nextSession.startsAt)}
            </Text>
          )}
          <Text style={styles.cardMetaText}>· {distanceLabel}</Text>
        </View>
        <Text style={[styles.cardPrice, cls.isFree && { color: colors.success }]}>
          {cls.isFree ? 'Gratuit' : `${cls.price}€`}
        </Text>
      </View>
      <View style={styles.heartWrap}>
        <FavoriteButton classId={cls.id} size="sm" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyHeart: {
    fontSize: 72,
    color: colors.textLight,
    marginBottom: spacing.lg,
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  exploreBtn: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.full,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardImage: { width: 110, height: 120 },
  catDot: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cardTeacher: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  cardMetaText: {
    fontSize: 11,
    color: colors.textLight,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  heartWrap: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});
