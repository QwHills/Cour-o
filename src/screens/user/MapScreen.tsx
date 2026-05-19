import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CompactCourseCard, {
  COMPACT_CARD_WIDTH,
} from '../../components/CompactCourseCard';
import FilterChips from '../../components/FilterChips';
import BellIcon from '../../components/BellIcon';
import MapViewSection, { MapMarker, Region } from '../../components/map/MapViewSection';
import ModeSwitchFab from '../../components/ModeSwitchFab';
import { coursesService, EnrichedCourse } from '../../services/courses.service';
import { getCategoryIcon, getCategoryColor } from '../../utils/categoryIcons';
import { fuzzyCoordinates, distanceKm, isInRegion } from '../../utils/location';
import { colors, spacing } from '../../theme/theme';
import { isPromoLive } from '../../types/domain';

// Distance fallback radius (km) used when the visible viewport contains no
// courses — we still show the closest ones to give the user something useful.
const FALLBACK_RADIUS_KM = 20;

const RENNES_REGION = {
  latitude: 48.1113,
  longitude: -1.68,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

const CATEGORIES = [
  'Tous',
  'Promotions',
  'Ce soir',
  'Cette semaine',
  'Ce weekend',
  'Gratuit',
];

export default function MapScreen() {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [, setTick] = useState(0);
  const [activeMarkerId, setActiveMarkerId] = useState<string | undefined>();
  const [focusLocation, setFocusLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // Current map viewport — updated whenever the user pans/zooms. Used to
  // re-order the bottom card carousel so the cards matching the visible area
  // appear first. Initialised to the default Rennes region.
  const [region, setRegion] = useState<Region>(RENNES_REGION);
  // While the user swipes the bottom carousel we recenter the map programmatically,
  // which fires `onRegionChange`. We block those updates to avoid the loop:
  // map pan → region update → carousel reorders → new active card → map pans again.
  const isCardScrollingRef = useRef(false);
  const scrollResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Re-render when courses cache updates (after Supabase load)
  useEffect(() => coursesService.onChange(() => setTick((t) => t + 1)), []);

  const filteredCoursesAll: EnrichedCourse[] = coursesService.search({
    category: selectedCategory as any,
  });

  // Compute the cards to show in the bottom carousel, in this priority order :
  //   1. Courses whose pin is inside the visible map viewport.
  //   2. Otherwise (or to fill), courses within FALLBACK_RADIUS_KM of the
  //      map centre — closest first.
  // The map markers themselves still show ALL filtered courses; only the
  // bottom carousel is reordered.
  const filteredCourses: EnrichedCourse[] = useMemo(() => {
    const withCoords = filteredCoursesAll.filter((c) => !!c.teacher);
    const center = { lat: region.latitude, lng: region.longitude };
    const annotated = withCoords.map((c) => {
      const fuzzy = fuzzyCoordinates(
        c.teacher!.latitude,
        c.teacher!.longitude,
        c.teacher!.id,
      );
      return {
        course: c,
        lat: fuzzy.latitude,
        lng: fuzzy.longitude,
        inView: isInRegion(fuzzy.latitude, fuzzy.longitude, region),
        distKm: distanceKm(center.lat, center.lng, fuzzy.latitude, fuzzy.longitude),
      };
    });

    const visible = annotated
      .filter((a) => a.inView)
      .sort((a, b) => a.distKm - b.distKm);

    if (visible.length > 0) {
      // Visible courses first (closest to center), then nearby courses for
      // continuity (still bounded by FALLBACK_RADIUS_KM).
      const nearby = annotated
        .filter((a) => !a.inView && a.distKm <= FALLBACK_RADIUS_KM)
        .sort((a, b) => a.distKm - b.distKm);
      return [...visible, ...nearby].map((a) => a.course);
    }

    // Viewport is empty → only show courses within FALLBACK_RADIUS_KM.
    return annotated
      .filter((a) => a.distKm <= FALLBACK_RADIUS_KM)
      .sort((a, b) => a.distKm - b.distKm)
      .map((a) => a.course);
  }, [filteredCoursesAll, region]);

  // Markers cover ALL courses matching the category filter, regardless of
  // the current viewport — we don't want pins to vanish when the user pans.
  const markers: MapMarker[] = useMemo(
    () =>
      filteredCoursesAll
        .filter((c) => !!c.teacher)
        .map((c) => {
          const fuzzy = fuzzyCoordinates(c.teacher!.latitude, c.teacher!.longitude, c.teacher!.id);
          const priceLabel = c.class.isFree ? 'Gratuit' : `${c.class.price}€`;
          return {
            id: c.class.id,
            latitude: fuzzy.latitude,
            longitude: fuzzy.longitude,
            label: priceLabel,
            title: c.class.title,
            description: priceLabel,
            color: getCategoryColor(c.class.category),
            icon: getCategoryIcon(c.class.category),
          };
        }),
    [filteredCoursesAll]
  );

  const handleCardPress = (course: EnrichedCourse) => {
    navigation.navigate('CourseDetail', { courseId: course.class.id });
  };

  // Center the map on the active card's location AND freeze the viewport
  // reordering so the carousel doesn't fight back.
  const focusOnCourse = (course: EnrichedCourse) => {
    if (!course.teacher) return;
    setActiveMarkerId(course.class.id);
    const fuzzy = fuzzyCoordinates(
      course.teacher.latitude,
      course.teacher.longitude,
      course.teacher.id,
    );
    setFocusLocation({ latitude: fuzzy.latitude, longitude: fuzzy.longitude });
    isCardScrollingRef.current = true;
    if (scrollResetTimeoutRef.current) clearTimeout(scrollResetTimeoutRef.current);
    scrollResetTimeoutRef.current = setTimeout(() => {
      isCardScrollingRef.current = false;
    }, 900); // matches map animation duration + small buffer
  };

  // FlatList requires a stable identity — wrap in useRef so it's created once.
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const course = viewableItems[0].item as EnrichedCourse;
      if (course) focusOnCourse(course);
    }
  }).current;

  const handleRegionChange = (r: Region) => {
    if (isCardScrollingRef.current) return;
    setRegion(r);
  };

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollResetTimeoutRef.current) clearTimeout(scrollResetTimeoutRef.current);
    };
  }, []);

  // Subset for the Promotions horizontal section (always shown if non-empty,
  // regardless of selectedCategory — it's a discovery surface).
  // Promo is per-session: a course shows here only if its nextSession is on promo.
  const promoCourses: EnrichedCourse[] = useMemo(
    () => coursesService.listAll().filter((c) => !!c.nextSession && isPromoLive(c.nextSession)),
    // depends on cache version (selectedCategory triggers re-render too)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCategory],
  );

  return (
    <View style={styles.container}>
      <MapViewSection
        initialRegion={RENNES_REGION}
        markers={markers}
        activeMarkerId={activeMarkerId}
        onMarkerPress={(id) => {
          const c = filteredCoursesAll.find((x) => x.class.id === id);
          if (c) handleCardPress(c);
        }}
        onRegionChange={handleRegionChange}
        focusLocation={focusLocation}
      />

      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.85}
        >
          <Text style={styles.searchBarIcon}>⌕</Text>
          <Text style={styles.searchBarPlaceholder}>Rechercher un cours, un prof…</Text>
        </TouchableOpacity>
        <BellIcon />
      </View>

      <View style={styles.cardsContainer}>
        {promoCourses.length > 0 && selectedCategory !== 'Promotions' && (
          <View style={styles.promoSection}>
            <View style={styles.promoHeader}>
              <Text style={styles.promoBolt}>⚡</Text>
              <Text style={styles.promoTitle}>Promotions</Text>
              <TouchableOpacity onPress={() => setSelectedCategory('Promotions')}>
                <Text style={styles.promoSeeAll}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={promoCourses}
              keyExtractor={(item) => 'promo-' + item.class.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={COMPACT_CARD_WIDTH + spacing.sm}
              decelerationRate="fast"
              contentContainerStyle={styles.cardsList}
              renderItem={({ item }) => (
                <CompactCourseCard course={item} onPress={() => handleCardPress(item)} />
              )}
            />
          </View>
        )}

        <FilterChips
          categories={CATEGORIES}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        {filteredCourses.length === 0 ? (
          <Text style={styles.emptyHint}>
            Aucun cours pour ces filtres. Essaie d'élargir la recherche.
          </Text>
        ) : (
          <FlatList
            data={filteredCourses}
            keyExtractor={(item) => item.class.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={COMPACT_CARD_WIDTH + spacing.sm}
            decelerationRate="fast"
            contentContainerStyle={styles.cardsList}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            renderItem={({ item }) => (
              <CompactCourseCard course={item} onPress={() => handleCardPress(item)} />
            )}
          />
        )}
      </View>
      <ModeSwitchFab bottom={88} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    zIndex: 30, // keep above Leaflet stacking context on web
    backgroundColor: 'transparent',
  },
  promoSection: {
    marginBottom: spacing.sm,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: 6,
  },
  promoBolt: {
    fontSize: 14,
  },
  promoTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  promoSeeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyHint: {
    paddingHorizontal: spacing.md,
    fontSize: 12,
    color: colors.textLight,
    paddingVertical: spacing.sm,
  },
  cardsList: {
    paddingHorizontal: spacing.md,
  },
  topActions: {
    position: 'absolute',
    top: 56,
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  searchBarIcon: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  searchBarPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
