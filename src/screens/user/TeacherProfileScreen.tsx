import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTeacherById } from '../../data/mockTeachers';
import { coursesService, EnrichedCourse } from '../../services/courses.service';
import { mockQuestionnaires } from '../../data/mockQuestionnaires';
import { productsService } from '../../services/products.service';
import { creditsService } from '../../services/credits.service';
import { teachersService } from '../../services/teachers.service';
import { authService } from '../../services/auth.service';
import { supabase } from '../../services/supabase/client';
import { maskAddress } from '../../utils/location';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import { getCategoryColor } from '../../utils/categoryIcons';
import TeacherBadge from '../../components/TeacherBadge';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { formatDateLabel, formatTimeLabel } from '../../utils/date';
import { Product, ProductKind, TeacherProfile } from '../../types/domain';

const { width } = Dimensions.get('window');

export default function TeacherProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { teacherId } = route.params;

  // Resolve the teacher profile. We try local mock first (fast path for the
  // 4 historical demo profiles), then fall back to a Supabase fetch so any
  // teacher seeded in DB (incl. the Rennes seed) is also displayable.
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>(() =>
    getTeacherById(teacherId) ?? teachersService.getCached(teacherId),
  );
  const [teacherLoading, setTeacherLoading] = useState(!teacher);
  useEffect(() => {
    let cancelled = false;
    if (!teacher) {
      setTeacherLoading(true);
      teachersService.get(teacherId).then((t) => {
        if (cancelled) return;
        setTeacher(t);
        setTeacherLoading(false);
      });
    }
    return () => { cancelled = true; };
  }, [teacherId]);

  // Re-render when products or credit wallets are (re)loaded from Supabase,
  // otherwise the Offers section stays empty when the user lands on this
  // screen before productsService.load() finishes. We also fetch this
  // teacher's products directly as a fallback so the section works even if
  // the global cache is still cold (e.g. deep link / fresh install).
  const [, setTick] = useState(0);
  const [directProducts, setDirectProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    const unsubP = productsService.onChange(() => setTick((t) => t + 1));
    const unsubC = creditsService.onChange(() => setTick((t) => t + 1));
    productsService.load().catch(() => {});

    // Reset so we never briefly show the previous teacher's products.
    setDirectProducts(null);

    let cancelled = false;
    supabase
      .from('products')
      .select('*')
      .eq('owner_type', 'teacher')
      .eq('owner_id', teacherId)
      .eq('active', true)
      .then(({ data }) => {
        if (cancelled) return;
        setDirectProducts(
          (data ?? []).map((r: any) => ({
            id: r.id,
            ownerType: 'teacher',
            ownerId: r.owner_id,
            name: r.name,
            description: r.description ?? '',
            kind: r.kind,
            price: Number(r.price ?? 0),
            creditsGranted: r.credits_granted ?? undefined,
            billingInterval: r.billing_interval ?? undefined,
            validityDays: r.validity_days ?? undefined,
            active: !!r.active,
            createdAt: r.created_at,
          })),
        );
      });

    return () => {
      cancelled = true;
      unsubP();
      unsubC();
    };
  }, [teacherId]);

  if (!teacher) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
          {teacherLoading ? 'Chargement…' : 'Professeur introuvable'}
        </Text>
      </View>
    );
  }

  // All courses from this teacher
  const allCourses = coursesService.listAll();
  const teacherCourses = allCourses.filter((c) => c.teacher?.id === teacherId);

  // All reviews (questionnaires) for this teacher
  const reviews = mockQuestionnaires
    .filter((q) => q.teacherId === teacherId)
    .filter((q) => q.comment) // only with comments
    .slice(0, 5);

  // Commercial products sold by this teacher (subscriptions, credit packs,
  // single-class items). Only active ones are offered to students. Prefer
  // the global cache, fall back to the direct-fetch results if the cache
  // isn't populated yet.
  const cachedProducts = productsService.listForOwner(
    { type: 'teacher', id: teacherId },
    { onlyActive: true },
  );
  const products: Product[] =
    cachedProducts.length > 0 ? cachedProducts : directProducts ?? [];

  // Current user's credit balance with this teacher — surfaced in the
  // offers section so returning customers see their remaining credits.
  const currentUser = authService.getCurrentUser();
  const creditBalance = currentUser
    ? creditsService.getBalance(currentUser.id, { type: 'teacher', id: teacherId })
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#F5E6DC', '#FBF8F4']}
            style={styles.heroGradient}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <Image source={{ uri: teacher.photoUrl }} style={styles.avatar} />
          <Text style={styles.name}>{teacher.displayName}</Text>
          <TeacherBadge status={teacher.status} style={{ marginTop: spacing.sm }} />

          {/* Rating summary — tap to see reviews */}
          {teacher.reviewCount > 0 && (
            <TouchableOpacity
              style={styles.ratingRow}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('TeacherReviews', { teacherId: teacher.id })
              }
            >
              <Text style={styles.stars}>★</Text>
              <Text style={styles.ratingValue}>{teacher.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>
                ({teacher.reviewCount} avis ›)
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.location}>
            ◆ {maskAddress(teacher.address, teacher.latitude, teacher.longitude)}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{teacherCourses.length}</Text>
            <Text style={styles.statLabel}>Cours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {teacher.reviewCount > 0 ? teacher.rating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.statLabel}>Note</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {teacher.status === 'certified_teacher' || teacher.status === 'professional'
                ? '✓'
                : `${teacher.freeClassesCompleted}/3`}
            </Text>
            <Text style={styles.statLabel}>
              {teacher.status === 'certified_teacher' || teacher.status === 'professional'
                ? 'Validé'
                : 'Parcours'}
            </Text>
          </View>
        </View>

        {/* Photos gallery */}
        {teacher.photos && (teacher.photos.place || teacher.photos.self || teacher.photos.activity) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>En images</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoGallery}
            >
              {teacher.photos.activity && (
                <View style={styles.photoItem}>
                  <Image source={{ uri: teacher.photos.activity }} style={styles.photoImage} />
                  <Text style={styles.photoCaption}>L'activité</Text>
                </View>
              )}
              {teacher.photos.place && (
                <View style={styles.photoItem}>
                  <Image source={{ uri: teacher.photos.place }} style={styles.photoImage} />
                  <Text style={styles.photoCaption}>Le lieu</Text>
                </View>
              )}
              {teacher.photos.self && (
                <View style={styles.photoItem}>
                  <Image source={{ uri: teacher.photos.self }} style={styles.photoImage} />
                  <Text style={styles.photoCaption}>Le professeur</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Bio */}
        {teacher.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>À propos</Text>
            <Text style={styles.bio}>{teacher.bio}</Text>
          </View>
        )}

        {/* Categories */}
        {teacher.categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Catégories</Text>
            <View style={styles.catRow}>
              {teacher.categories.map((cat) => (
                <View
                  key={cat}
                  style={[styles.catPill, { backgroundColor: getCategoryColor(cat) }]}
                >
                  <Text style={styles.catPillText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Products (abonnements, packs, cours à l'unité) */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.offersHeader}>
              <Text style={styles.sectionLabel}>Offres</Text>
              {creditBalance > 0 && (
                <Badge
                  label={`Tu as ${creditBalance} crédit${creditBalance > 1 ? 's' : ''}`}
                  variant="success"
                  small
                />
              )}
            </View>
            {products.map((p) => (
              <ProductOfferCard
                key={p.id}
                product={p}
                onPress={() =>
                  navigation.navigate('ProductCheckout', { productId: p.id })
                }
              />
            ))}
          </View>
        )}

        {/* Courses */}
        {teacherCourses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Cours proposés ({teacherCourses.length})
            </Text>
            {teacherCourses.map((course) => (
              <MiniCourseCard
                key={course.class.id}
                course={course}
                onPress={() =>
                  navigation.navigate('CourseDetail', { courseId: course.class.id })
                }
              />
            ))}
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Avis récents</Text>
            {reviews.map((r) => (
              <Card key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewInitial}>
                      {r.userId.charAt(2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>Participant</Text>
                    <Text style={styles.reviewStars}>
                      {'★'.repeat(r.answers.q5_rating)}
                      <Text style={{ color: colors.borderLight }}>
                        {'★'.repeat(5 - r.answers.q5_rating)}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.reviewDate}>
                    {formatDateLabel(r.createdAt)}
                  </Text>
                </View>
                {r.comment && <Text style={styles.reviewText}>"{r.comment}"</Text>}
              </Card>
            ))}
          </View>
        )}

        {/* Trust notice for new teachers */}
        {(teacher.status === 'new_teacher' || teacher.status === 'under_review') && (
          <View style={styles.trustNotice}>
            <Text style={styles.trustNoticeTitle}>Nouveau sur Koureo</Text>
            <Text style={styles.trustNoticeText}>
              {teacher.displayName} est en phase d'évaluation. Ses cours sont
              proposés gratuitement. Ton retour l'aidera à être certifié.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ProductOfferCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const icon = PRODUCT_ICON[product.kind];
  const label = PRODUCT_LABEL[product.kind];
  const unit = product.billingInterval === 'monthly' ? '/ mois' : '';
  const credits = product.creditsGranted ?? 0;
  const subline = product.kind === 'single_class'
    ? "1 cours à l'unité"
    : product.kind === 'monthly_subscription'
      ? `${credits} crédit${credits > 1 ? 's' : ''} par mois · renouvelé chaque mois`
      : `${credits} crédit${credits > 1 ? 's' : ''} · valable ${product.validityDays ?? 90} jours`;
  return (
    <TouchableOpacity
      style={styles.offerCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text style={styles.offerIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.offerBadge}>{label}</Text>
        <Text style={styles.offerName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.offerSub}>{subline}</Text>
      </View>
      <View style={styles.offerRight}>
        <Text style={styles.offerPrice}>{product.price.toFixed(0)}€</Text>
        {unit !== '' && <Text style={styles.offerUnit}>{unit}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const PRODUCT_ICON: Record<ProductKind, string> = {
  single_class: '🎟️',
  credit_pack: '🎁',
  monthly_subscription: '💳',
};
const PRODUCT_LABEL: Record<ProductKind, string> = {
  single_class: "Cours à l'unité",
  credit_pack: 'Pack',
  monthly_subscription: 'Abonnement',
};

function MiniCourseCard({
  course,
  onPress,
}: {
  course: EnrichedCourse;
  onPress: () => void;
}) {
  const { class: cls, nextSession } = course;
  return (
    <TouchableOpacity
      style={styles.miniCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: cls.imageUrl }} style={styles.miniImage} />
      <View style={styles.miniContent}>
        <Badge label={cls.category} variant="primary" small />
        <Text style={styles.miniTitle} numberOfLines={1}>{cls.title}</Text>
        {nextSession && (
          <Text style={styles.miniMeta}>
            {formatDateLabel(nextSession.startsAt)} · {formatTimeLabel(nextSession.startsAt)}
          </Text>
        )}
        <Text style={[styles.miniPrice, cls.isFree && { color: colors.success }]}>
          {cls.isFree ? 'Gratuit' : `${cls.price}€`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },

  // Offers section
  offersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  offerIcon: { fontSize: 26 },
  offerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  offerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  offerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  offerRight: { alignItems: 'flex-end' },
  offerPrice: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  offerUnit: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: -2 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  backText: { fontSize: 22, color: colors.text },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...shadows.card,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    letterSpacing: -0.3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
  },
  stars: { fontSize: 16, color: colors.accent },
  ratingValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  ratingCount: { fontSize: 13, color: colors.textSecondary, marginLeft: 2 },
  location: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
    marginTop: 3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  bio: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
    fontWeight: '400',
  },

  // Photos gallery
  photoGallery: {
    gap: spacing.md,
  },
  photoItem: {
    width: width * 0.7,
  },
  photoImage: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
  },
  photoCaption: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    marginTop: spacing.sm,
    letterSpacing: 0.3,
  },

  // Categories
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Mini course card
  miniCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  miniImage: { width: 90, height: 100 },
  miniContent: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  miniTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  miniMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  miniPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },

  // Reviews
  reviewCard: { marginBottom: spacing.sm },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  reviewName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  reviewStars: {
    fontSize: 13,
    color: colors.accent,
    marginTop: 1,
    letterSpacing: 1,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.textLight,
  },
  reviewText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic',
  },

  // Trust notice
  trustNotice: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  trustNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  trustNoticeText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
