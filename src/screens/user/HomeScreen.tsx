// User-side home/landing screen — "Accueil" tab.
// Greets the signed-in user, exposes top categories, and surfaces the closest
// activities as a 2x2 grid. The map remains on its own "Explorer" tab.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import BellIcon from '../../components/BellIcon';
import FavoriteButton from '../../components/FavoriteButton';
import { coursesService, EnrichedCourse } from '../../services/courses.service';
import { authService } from '../../services/auth.service';
import { formatDateLabel, formatTimeLabel } from '../../utils/date';
import { publicTeacherName } from '../../utils/teacherName';
import { isPromoLive } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';

type CategoryShortcut = {
  label: string;
  // Maps to a real Category value used by coursesService.search()
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// 6 top-level shortcuts shown above the fold. The "Ateliers" label maps to the
// data-model category "Créatif" (workshops are the bulk of that bucket).
const SHORTCUTS: CategoryShortcut[] = [
  { label: 'Sport',     category: 'Sport',     icon: 'barbell-outline' },
  { label: 'Bien-être', category: 'Bien-être', icon: 'flower-outline' },
  { label: 'Danse',     category: 'Danse',     icon: 'musical-notes-outline' },
  { label: 'Ateliers',  category: 'Créatif',   icon: 'color-palette-outline' },
  { label: 'Musique',   category: 'Musique',   icon: 'musical-note-outline' },
  { label: 'Cuisine',   category: 'Cuisine',   icon: 'restaurant-outline' },
];

// Cap the effective width at a phone-class size so the grid stays sane on
// large web viewports — without this, `Dimensions.get('window').width` reads
// the full browser window and the cards balloon to 600+px on desktop.
const WINDOW_WIDTH = Math.min(Dimensions.get('window').width, 420);
// 2 columns with 16px outer padding and a 12px gutter between cards.
const NEARBY_CARD_WIDTH = (WINDOW_WIDTH - spacing.lg * 2 - 12) / 2;

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  // Subscribe to auth so the greeting updates if the session hydrates late.
  const [user, setUser] = useState(() => authService.getCurrentUser());
  useEffect(() => {
    return authService.onChange(() => setUser(authService.getCurrentUser()));
  }, []);

  // Re-render when the courses cache changes (Supabase load, favorites, etc.)
  const [, setTick] = useState(0);
  useEffect(() => coursesService.onChange(() => setTick((t) => t + 1)), []);

  const nearby: EnrichedCourse[] = useMemo(() => {
    return [...coursesService.listAll()]
      .filter((c) => !!c.nextSession)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 4);
  }, [user?.id]);

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] ?? '';

  const goToCategory = (category: string) => {
    // Push the SearchScreen (inside the Explorer stack) pre-filled with the
    // tapped category. We use the Explorer tab so the back arrow returns to a
    // sensible context (the map).
    navigation.navigate('Explorer', {
      screen: 'Search',
      params: { category },
      initial: false,
    });
  };

  const goToExplorer = () => {
    navigation.navigate('Explorer', { screen: 'MapHome' });
  };

  const goToCourse = (classId: string) => {
    navigation.navigate('Explorer', {
      screen: 'CourseDetail',
      params: { courseId: classId },
      initial: false,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top header — logo wordmark + bell */}
        <View style={styles.header}>
          <Text style={styles.brand}>
            k<Text style={styles.brandAccent}>ou</Text>réo
          </Text>
          <BellIcon />
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>
          Bonjour{firstName ? ` ${firstName}` : ''} <Text style={styles.wave}>👋</Text>
        </Text>
        <Text style={styles.subtitle}>Que veux-tu faire aujourd'hui ?</Text>

        {/* Category shortcuts — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcutsRow}
        >
          {SHORTCUTS.map((s) => (
            <TouchableOpacity
              key={s.category}
              style={styles.shortcut}
              activeOpacity={0.85}
              onPress={() => goToCategory(s.category)}
            >
              <View style={styles.shortcutCircle}>
                <Ionicons name={s.icon} size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Nearby section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activités autour de toi</Text>
          <TouchableOpacity onPress={goToExplorer} hitSlop={8}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {nearby.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="compass-outline" size={32} color={colors.textLight} />
            <Text style={styles.emptyText}>
              Aucune activité disponible pour le moment. Reviens bientôt.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {nearby.map((c) => (
              <NearbyCard
                key={c.class.id}
                course={c}
                onPress={() => goToCourse(c.class.id)}
              />
            ))}
          </View>
        )}

        {/* CTA — go to map */}
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.85}
          onPress={goToExplorer}
        >
          <Text style={styles.ctaText}>Voir toutes les activités</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primaryDark} />
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

// Single grid card — image on top, info underneath. Built inline because its
// layout differs from CompactCourseCard (horizontal) used in the Explorer.
function NearbyCard({
  course,
  onPress,
}: {
  course: EnrichedCourse;
  onPress: () => void;
}) {
  const { class: cls, teacher, nextSession, distanceLabel } = course;
  const promo = !!nextSession && isPromoLive(nextSession) && typeof nextSession.promoPrice === 'number';
  const displayPrice = cls.isFree
    ? 'Gratuit'
    : promo
      ? `${nextSession!.promoPrice}€`
      : `${cls.price}€`;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.cardImageWrap}>
        {cls.imageUrl ? (
          <Image source={{ uri: cls.imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="image-outline" size={24} color={colors.textLight} />
          </View>
        )}
        {distanceLabel && (
          <View style={styles.distancePill}>
            <Text style={styles.distancePillText}>{distanceLabel}</Text>
          </View>
        )}
        <View style={styles.favWrap}>
          <FavoriteButton classId={cls.id} size="sm" />
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>
        {cls.title}
      </Text>

      {nextSession ? (
        <Text style={styles.cardWhen} numberOfLines={1}>
          {formatDateLabel(nextSession.startsAt)} {formatTimeLabel(nextSession.startsAt)}
        </Text>
      ) : (
        <Text style={styles.cardWhen} numberOfLines={1}>—</Text>
      )}

      {teacher && (
        <Text style={styles.cardWhere} numberOfLines={1}>
          {publicTeacherName(teacher)}
        </Text>
      )}

      <Text style={[styles.cardPrice, promo && styles.cardPricePromo]}>
        {displayPrice}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 64,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandAccent: { color: colors.primary },

  // Greeting
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  wave: { fontSize: 24 },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },

  // Shortcuts row
  shortcutsRow: {
    paddingRight: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  shortcut: {
    alignItems: 'center',
    width: 64,
  },
  shortcutCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.lg,
  },

  // Card
  card: {
    width: NEARBY_CARD_WIDTH,
  },
  cardImageWrap: {
    width: '100%',
    // Landscape-ish ratio (~5:4) — closer to the mockup, avoids the tall
    // square that overflowed the fold on wider viewports (especially web).
    aspectRatio: 5 / 4,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.xs + 2,
    backgroundColor: colors.surface,
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  distancePill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    ...shadows.sm,
  },
  distancePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  favWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  cardWhen: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  cardWhere: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  cardPricePromo: { color: colors.primary },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: radii.full,
    gap: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },
});
