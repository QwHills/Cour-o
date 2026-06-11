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
import Ionicons from '@expo/vector-icons/Ionicons';
import CompactCourseCard, {
  COMPACT_CARD_WIDTH,
} from '../../components/CompactCourseCard';
import FilterChips from '../../components/FilterChips';
import BellIcon from '../../components/BellIcon';
import MapViewSection, { MapMarker, Region } from '../../components/map/MapViewSection';
import ModeSwitchFab from '../../components/ModeSwitchFab';
import { coursesService, EnrichedCourse } from '../../services/courses.service';
import { locationService } from '../../services/location.service';
import { favoritesService } from '../../services/favorites.service';
import { authService } from '../../services/auth.service';
import { userPreferencesService } from '../../services/userPreferences.service';
import { getCategoryIcon, getCategoryColor } from '../../utils/categoryIcons';
import { fuzzyCoordinates, distanceKm, isInRegion } from '../../utils/location';
import { colors, spacing } from '../../theme/theme';
import { isPromoLive } from '../../types/domain';

// Distance fallback radius (km) used when the visible viewport contains no
// courses — we still show the closest ones to give the user something useful.
const FALLBACK_RADIUS_KM = 20;
// Hard cap on how far a course can be from the user's resolved geolocation
// before we drop it from the bottom carousel entirely. Pan-to-anywhere is
// fine for browsing the map, but we never want a card from another city
// to appear next to the user just because they panned over it.
// NOTE: the two radius constants below are now defaults — the actual values
// come from `userPreferencesService` and can be tuned per user from the Profil
// screen. We keep the constants as fallbacks when prefs aren't hydrated yet.
const USER_MAX_RADIUS_KM_DEFAULT = 30;
const PROMO_MAX_RADIUS_KM_DEFAULT = 5;

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
  // Bumped every time we ask the map to recenter — forces the child useEffect
  // to refire even when the target lat/lng is identical to the previous one
  // (e.g. tapping the locate FAB twice in a row).
  const [focusKey, setFocusKey] = useState(0);
  const requestFocus = (loc: { latitude: number; longitude: number }) => {
    setFocusLocation(loc);
    setFocusKey((k) => k + 1);
  };
  // Current map viewport — updated whenever the user pans/zooms. Used to
  // re-order the bottom card carousel so the cards matching the visible area
  // appear first. Initialised to the default Rennes region.
  const [region, setRegion] = useState<Region>(RENNES_REGION);
  // While the user swipes the bottom carousel we recenter the map programmatically,
  // which fires `onRegionChange`. We block those updates to avoid the loop:
  // map pan → region update → carousel reorders → new active card → map pans again.
  const isCardScrollingRef = useRef(false);
  const scrollResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True only while the user actively drags the carousel. `onViewableItemsChanged`
  // ALSO fires when the data prop reorders (e.g. after the user pans the map),
  // and in that case we must NOT recenter the map — otherwise pan gets hijacked
  // by the active card's location.
  const isUserDraggingCarouselRef = useRef(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Re-render when courses cache updates (after Supabase load)
  useEffect(() => coursesService.onChange(() => setTick((t) => t + 1)), []);

  // Keep favorites cache hydrated + re-render when the user toggles one.
  // Used by the Promotions section to decide whether a discounted session
  // should show even though it's outside the 5 km nearby radius.
  const currentUserId = authService.getCurrentUser()?.id;
  useEffect(() => {
    if (currentUserId) favoritesService.load(currentUserId).catch(() => {});
    const unsub = favoritesService.onChange(() => setTick((t) => t + 1));
    return unsub;
  }, [currentUserId]);

  // User-tunable discovery radii (set from Profil → Rayon de recherche).
  const [radii, setRadii] = useState(userPreferencesService.get());
  useEffect(() => {
    const unsub = userPreferencesService.onChange(setRadii);
    userPreferencesService.hydrate().then(setRadii);
    return unsub;
  }, []);
  const userMaxRadiusKm = radii.activitiesKm || USER_MAX_RADIUS_KM_DEFAULT;
  const promoMaxRadiusKm = radii.promotionsKm || PROMO_MAX_RADIUS_KM_DEFAULT;

  // Track the user's geo position. Used both for the per-card distance label
  // and as the auto-center target each time the user lands on this screen.
  const [userCoords, setUserCoords] = useState(() => locationService.getCurrent());
  useEffect(() => {
    const unsub = locationService.onChange((c) => setUserCoords(c));
    locationService.hydrate();
    return unsub;
  }, []);

  // Auto-center on the user's position ONCE per mount, the first time the OS
  // position resolves. After that the user pans freely — we never recenter
  // automatically again so the map doesn't keep snapping back. The locate
  // FAB (bottom-right) is the explicit "take me to me" affordance.
  const hasAutoCenteredRef = useRef(false);
  useEffect(() => {
    if (hasAutoCenteredRef.current) return;
    if (!userCoords.resolved) return;
    hasAutoCenteredRef.current = true;
    requestFocus({ latitude: userCoords.latitude, longitude: userCoords.longitude });
    isCardScrollingRef.current = true;
    if (scrollResetTimeoutRef.current) clearTimeout(scrollResetTimeoutRef.current);
    scrollResetTimeoutRef.current = setTimeout(() => {
      isCardScrollingRef.current = false;
    }, 900);
  }, [userCoords.resolved, userCoords.latitude, userCoords.longitude]);

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
    // First drop courses that are too far from the user — distanceMeters is
    // computed against the resolved geoloc in courses.service.enrich(). Skip
    // this gate if the position hasn't resolved yet (everything stays visible
    // so the screen isn't empty during the OS permission prompt).
    const radiusGated = userCoords.resolved
      ? filteredCoursesAll.filter((c) => c.distanceMeters <= userMaxRadiusKm * 1000)
      : filteredCoursesAll;
    const withCoords = radiusGated.filter((c) => !!c.teacher);
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
    // userCoords drives the radius gate above — recompute when it resolves.
  }, [filteredCoursesAll, region, userCoords.resolved, userCoords.latitude, userCoords.longitude, userMaxRadiusKm]);

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
    requestFocus({ latitude: fuzzy.latitude, longitude: fuzzy.longitude });
    isCardScrollingRef.current = true;
    if (scrollResetTimeoutRef.current) clearTimeout(scrollResetTimeoutRef.current);
    scrollResetTimeoutRef.current = setTimeout(() => {
      isCardScrollingRef.current = false;
    }, 900); // matches map animation duration + small buffer
  };

  // FlatList requires a stable identity — wrap in useRef so it's created once.
  // We only recenter the map on the now-visible card if the user is actively
  // dragging the carousel. Passive reorderings (triggered by a map pan) must
  // leave the viewport alone.
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!isUserDraggingCarouselRef.current) return;
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
  const promoCourses: EnrichedCourse[] = useMemo(() => {
    const all = coursesService
      .listAll()
      .filter((c) => !!c.nextSession && isPromoLive(c.nextSession));

    // "Nearby" for promos is measured from the MAP CENTER (what the user is
    // looking at), not their physical position. As they pan, promos surface
    // dynamically for the area they're exploring. Cheaper than re-running
    // geocoding and gives the section a sense of place.
    const center = { lat: region.latitude, lng: region.longitude };
    const distKmFromCenter = (c: EnrichedCourse) => {
      if (!c.teacher) return Infinity;
      const fuzzy = fuzzyCoordinates(c.teacher.latitude, c.teacher.longitude, c.teacher.id);
      return distanceKm(center.lat, center.lng, fuzzy.latitude, fuzzy.longitude);
    };

    if (!currentUserId) {
      // Anonymous browser → use the configured promo radius from map center.
      return all.filter((c) => distKmFromCenter(c) <= promoMaxRadiusKm);
    }

    const favs = new Set(favoritesService.list(currentUserId));
    // Pre-compute "any other class of this teacher is favorited" so a single
    // teacher-favorited class makes ALL their promos visible (we don't have
    // an explicit teacher-favorites table yet).
    const favoritedTeachers = new Set<string>();
    for (const c of coursesService.listAll()) {
      if (favs.has(c.class.id)) favoritedTeachers.add(c.class.teacherId);
    }

    return all.filter((c) => {
      const isFav = favs.has(c.class.id);
      const isFavTeacher = favoritedTeachers.has(c.class.teacherId);
      const isNearby = distKmFromCenter(c) <= promoMaxRadiusKm;
      return isFav || isFavTeacher || isNearby;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, currentUserId, region.latitude, region.longitude, promoMaxRadiusKm]);

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
        focusKey={focusKey}
        userLocation={
          userCoords.resolved
            ? { latitude: userCoords.latitude, longitude: userCoords.longitude }
            : null
        }
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

      {/* Locate-me FAB — centers the map on the user's real position.
          Hidden until the locationService has resolved the OS position. */}
      {userCoords.resolved && (
        <TouchableOpacity
          style={styles.locateFab}
          activeOpacity={0.85}
          onPress={() => {
            // Recenter immediately with the cached coords, then ask the OS
            // for a fresh fix in the background. If the user has moved since
            // the app launched, the second `requestFocus` flies them to the
            // updated position seconds later — no manual reload needed.
            requestFocus({
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
            });
            isCardScrollingRef.current = true;
            if (scrollResetTimeoutRef.current) clearTimeout(scrollResetTimeoutRef.current);
            scrollResetTimeoutRef.current = setTimeout(() => {
              isCardScrollingRef.current = false;
            }, 900);
            locationService.refresh().then((coords) => {
              if (!coords.resolved) return;
              if (coords.latitude === userCoords.latitude && coords.longitude === userCoords.longitude) return;
              requestFocus({ latitude: coords.latitude, longitude: coords.longitude });
            }).catch(() => {});
          }}
        >
          <Ionicons name="locate" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
      )}

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
            onScrollBeginDrag={() => { isUserDraggingCarouselRef.current = true; }}
            onMomentumScrollEnd={() => { isUserDraggingCarouselRef.current = false; }}
            onScrollEndDrag={() => {
              // Cleared on momentum end, but if there's no momentum (very slow
              // release) the momentum callback never fires — reset here too.
              setTimeout(() => { isUserDraggingCarouselRef.current = false; }, 300);
            }}
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
  locateFab: {
    position: 'absolute',
    // Sits just above the bottom carousel — adjust if the carousel height changes.
    bottom: 280,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1714',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
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
