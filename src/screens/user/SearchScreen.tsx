import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { coursesService, EnrichedCourse } from '../../services/courses.service';
import { ClassFormat, Level } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import { getCategoryColor } from '../../utils/categoryIcons';
import TeacherBadge from '../../components/TeacherBadge';
import { formatDateLabel, formatTimeLabel } from '../../utils/date';

const CATEGORIES = [
  'Yoga', 'Danse', 'Musique', 'Sport', 'Bien-être', 'Langues',
  'Créatif', 'Cuisine', 'Développement personnel', 'Enfants', 'Business',
];

const FORMAT_OPTIONS: { label: string; value: ClassFormat }[] = [
  { label: 'Collectif', value: 'group' },
  { label: 'Individuel', value: 'individual' },
];

const LEVEL_OPTIONS: { label: string; value: Level }[] = [
  { label: 'Débutant', value: 'beginner' },
  { label: 'Intermédiaire', value: 'intermediate' },
  { label: 'Avancé', value: 'advanced' },
  { label: 'Tous niveaux', value: 'all' },
];

const PRICE_STEPS = [0, 10, 20, 30, 50, 100];
// `null` = "Plus" (no distance cap). Keep null as a real entry so the chip row
// includes an "et plus" option — when the user picks it we apply no filter.
const DISTANCE_STEPS: Array<{ meters: number | null; label: string }> = [
  { meters: 500, label: '500m' },
  { meters: 1000, label: '1km' },
  { meters: 5000, label: '5km' },
  { meters: null, label: 'Plus' },
];

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [format, setFormat] = useState<ClassFormat | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [maxPriceIdx, setMaxPriceIdx] = useState<number | null>(null);
  const [maxDistIdx, setMaxDistIdx] = useState<number | null>(null);
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => coursesService.onChange(() => setTick((t) => t + 1)), []);

  const hasFilters =
    !!category || !!format || !!level || maxPriceIdx !== null || maxDistIdx !== null || certifiedOnly || freeOnly;

  const selectedDistanceMeters =
    maxDistIdx !== null ? DISTANCE_STEPS[maxDistIdx]?.meters ?? null : null;

  const baseFilters = {
    query: query || undefined,
    category: category ?? undefined,
    format: format ?? undefined,
    level: level ?? undefined,
    maxPrice: maxPriceIdx !== null ? PRICE_STEPS[maxPriceIdx] : undefined,
    certifiedOnly: certifiedOnly || undefined,
    freeOnly: freeOnly || undefined,
  };

  const results: EnrichedCourse[] = useMemo(() => {
    return coursesService.search({
      ...baseFilters,
      maxDistanceMeters: selectedDistanceMeters ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, format, level, maxPriceIdx, maxDistIdx, certifiedOnly, freeOnly, tick]);

  // When the user picks a tight distance (e.g. 500m) and nothing matches, show
  // the closest course anyway — but keep all OTHER filters so it's still
  // relevant (same category/price/etc.).
  const closestFallback: EnrichedCourse | null = useMemo(() => {
    if (selectedDistanceMeters === null) return null; // "Plus" = no cap, no fallback needed
    if (results.length > 0) return null;
    const all = coursesService.search(baseFilters);
    if (all.length === 0) return null;
    return [...all].sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, format, level, maxPriceIdx, maxDistIdx, certifiedOnly, freeOnly, tick, results.length]);

  const resetFilters = () => {
    setCategory(null);
    setFormat(null);
    setLevel(null);
    setMaxPriceIdx(null);
    setMaxDistIdx(null);
    setCertifiedOnly(false);
    setFreeOnly(false);
  };

  return (
    <View style={styles.container}>
      {/* Header with search bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Salsa, yoga, Sophie…"
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Quick toggles */}
        <View style={styles.toggleRow}>
          <Toggle label="Gratuit" active={freeOnly} onPress={() => setFreeOnly(!freeOnly)} />
          <Toggle label="Certifié" active={certifiedOnly} onPress={() => setCertifiedOnly(!certifiedOnly)} />
        </View>

        {/* Categories */}
        <FilterGroup title="Catégorie">
          <ChipRow>
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                label={cat}
                active={category === cat}
                color={getCategoryColor(cat)}
                onPress={() => setCategory(category === cat ? null : cat)}
              />
            ))}
          </ChipRow>
        </FilterGroup>

        {/* Format */}
        <FilterGroup title="Format">
          <ChipRow>
            {FORMAT_OPTIONS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={format === f.value}
                onPress={() => setFormat(format === f.value ? null : f.value)}
              />
            ))}
          </ChipRow>
        </FilterGroup>

        {/* Level */}
        <FilterGroup title="Niveau">
          <ChipRow>
            {LEVEL_OPTIONS.map((l) => (
              <FilterChip
                key={l.value}
                label={l.label}
                active={level === l.value}
                onPress={() => setLevel(level === l.value ? null : l.value)}
              />
            ))}
          </ChipRow>
        </FilterGroup>

        {/* Max price */}
        <FilterGroup title={`Prix max${maxPriceIdx !== null ? ` · jusqu'à ${PRICE_STEPS[maxPriceIdx]}€` : ''}`}>
          <ChipRow>
            {PRICE_STEPS.map((p, i) => (
              <FilterChip
                key={p}
                label={p === 0 ? 'Gratuit' : `${p}€`}
                active={maxPriceIdx === i}
                onPress={() => setMaxPriceIdx(maxPriceIdx === i ? null : i)}
              />
            ))}
          </ChipRow>
        </FilterGroup>

        {/* Max distance */}
        <FilterGroup
          title={`Distance max${maxDistIdx !== null ? ` · ${DISTANCE_STEPS[maxDistIdx]?.label}` : ''}`}
        >
          <ChipRow>
            {DISTANCE_STEPS.map((d, i) => (
              <FilterChip
                key={d.label}
                label={d.label}
                active={maxDistIdx === i}
                onPress={() => setMaxDistIdx(maxDistIdx === i ? null : i)}
              />
            ))}
          </ChipRow>
        </FilterGroup>

        {/* Results */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </Text>
          {hasFilters && (
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
        </View>

        {results.length === 0 ? (
          closestFallback ? (
            <>
              <View style={styles.fallbackBanner}>
                <Text style={styles.fallbackTitle}>
                  Rien à moins de {DISTANCE_STEPS[maxDistIdx!]?.label}
                </Text>
                <Text style={styles.fallbackText}>
                  Voici le cours le plus proche qui correspond à ta recherche
                  ({closestFallback.distanceLabel}).
                </Text>
              </View>
              <ResultCard
                course={closestFallback}
                onPress={() =>
                  navigation.navigate('CourseDetail', { courseId: closestFallback.class.id })
                }
              />
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⌕</Text>
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptyText}>
                Essaie d'élargir ta recherche ou de retirer certains filtres.
              </Text>
            </View>
          )
        ) : (
          results.map((course) => (
            <ResultCard
              key={course.class.id}
              course={course}
              onPress={() => navigation.navigate('CourseDetail', { courseId: course.class.id })}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && { backgroundColor: color ?? colors.text, borderColor: color ?? colors.text },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.toggle, active && styles.toggleActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResultCard({ course, onPress }: { course: EnrichedCourse; onPress: () => void }) {
  const { class: cls, teacher, nextSession, distanceLabel } = course;
  return (
    <TouchableOpacity style={styles.result} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: cls.imageUrl }} style={styles.resultImage} />
      <View
        style={[styles.resultDot, { backgroundColor: getCategoryColor(cls.category) }]}
      />
      <View style={styles.resultContent}>
        <View style={styles.resultTop}>
          <Text style={styles.resultTitle} numberOfLines={1}>{cls.title}</Text>
          {teacher && <TeacherBadge status={teacher.status} small />}
        </View>
        {teacher && (
          <Text style={styles.resultTeacher}>avec {teacher.displayName}</Text>
        )}
        <View style={styles.resultMeta}>
          {nextSession && (
            <Text style={styles.resultMetaText}>
              {formatDateLabel(nextSession.startsAt)} · {formatTimeLabel(nextSession.startsAt)}
            </Text>
          )}
          <Text style={styles.resultMetaText}>· {distanceLabel}</Text>
        </View>
        <Text style={[styles.resultPrice, cls.isFree && { color: colors.success }]}>
          {cls.isFree ? 'Gratuit' : `${cls.price}€`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function formatDist(m: number): string {
  if (m < 1000) return `${m}m`;
  return `${m / 1000}km`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  back: { fontSize: 24, color: colors.text },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    height: 44,
  },
  searchIcon: { fontSize: 18, color: colors.textSecondary },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  clearText: { fontSize: 14, color: colors.textLight, paddingHorizontal: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  toggleLabelActive: { color: '#FFFFFF' },

  group: { marginBottom: spacing.lg },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  result: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  resultImage: { width: 96, height: 100 },
  resultDot: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultContent: { flex: 1, padding: spacing.md, gap: 2 },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  resultTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  resultTeacher: { fontSize: 12, color: colors.textSecondary },
  resultMeta: { flexDirection: 'row', gap: 4, marginTop: 2 },
  resultMetaText: { fontSize: 11, color: colors.textLight },
  resultPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.textLight,
    marginBottom: spacing.md,
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  fallbackBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  fallbackText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
