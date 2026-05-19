import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { coursesService } from '../../services/courses.service';
import { bookingsService } from '../../services/bookings.service';
import { authService } from '../../services/auth.service';
import { productsService } from '../../services/products.service';
import { creditsService } from '../../services/credits.service';
import { supabase } from '../../services/supabase/client';
import { Product, ProductKind } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import { formatDuration } from '../../utils/date';
import { maskAddress, hasConfirmedBooking } from '../../utils/location';
import CapacityBar from '../../components/CapacityBar';
import CancellationNotice from '../../components/CancellationNotice';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import TeacherBadge from '../../components/TeacherBadge';
import FavoriteButton from '../../components/FavoriteButton';

const { width, height } = Dimensions.get('window');
import { getCategoryColor } from '../../utils/categoryIcons';

const IMAGE_HEIGHT = Math.min(height * 0.48, 400);

export default function CourseDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const courseId: string = route.params.courseId;
  const course = coursesService.get(courseId);

  if (!course || !course.teacher) {
    return (
      <View style={styles.container}>
        <Text>Cours introuvable</Text>
      </View>
    );
  }

  const { class: cls, teacher: pro, nextSession, distanceLabel, spotsLeft } = course;
  const isIndividual = cls.format === 'individual';

  // Surface products (abos / packs / unité) sold by the owner of this class
  // so the user can buy credits directly from here — same UX as on the
  // teacher profile. Falls back to a direct Supabase fetch if the global
  // cache is still cold.
  const ownerType = cls.ownerType ?? 'teacher';
  const ownerId = cls.ownerId ?? cls.teacherId;

  const [, setTick] = useState(0);
  const [directProducts, setDirectProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    const unsubP = productsService.onChange(() => setTick((t) => t + 1));
    const unsubC = creditsService.onChange(() => setTick((t) => t + 1));
    productsService.load().catch(() => {});

    // Reset immediately so we never briefly show the PREVIOUS teacher's
    // products while the new fetch resolves (fixes cross-teacher leak).
    setDirectProducts(null);

    let cancelled = false;
    supabase
      .from('products')
      .select('*')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .eq('active', true)
      .then(({ data }) => {
        if (cancelled) return;
        setDirectProducts(
          (data ?? []).map((r: any) => ({
            id: r.id,
            ownerType: r.owner_type,
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
  }, [ownerType, ownerId]);

  const cachedProducts = productsService.listForOwner(
    { type: ownerType, id: ownerId },
    { onlyActive: true },
  );
  const products: Product[] =
    cachedProducts.length > 0 ? cachedProducts : directProducts ?? [];

  const currentUser = authService.getCurrentUser();
  const creditBalance = currentUser
    ? creditsService.getBalance(currentUser.id, { type: ownerType, id: ownerId })
    : 0;

  const levelLabel = {
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    all: 'Tous niveaux',
  }[cls.level];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: cls.imageUrl }} style={styles.image} />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.5)']}
            style={styles.imageGradient}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.heartButton}>
            <FavoriteButton classId={cls.id} size="md" />
          </View>
          <View style={styles.imageOverlay}>
            <Badge label={cls.category} variant="primary" />
            <Badge
              label={isIndividual ? 'Individuel' : 'Collectif'}
              variant="neutral"
              style={{ marginLeft: spacing.sm }}
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{cls.title}</Text>

          <TouchableOpacity
            style={styles.proCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TeacherProfile', { teacherId: pro.id })}
          >
            <Image source={{ uri: pro.photoUrl }} style={styles.proAvatar} />
            <View style={styles.proInfo}>
              <View style={styles.proNameRow}>
                <Text style={styles.proName}>{pro.displayName}</Text>
                <TeacherBadge status={pro.status} small />
              </View>
              {pro.reviewCount > 0 ? (
                <View style={styles.ratingRow}>
                  <Text style={styles.star}>★</Text>
                  <Text style={styles.rating}>
                    {pro.rating} ({pro.reviewCount} avis)
                  </Text>
                </View>
              ) : null}
              <Text style={styles.proLink}>Voir le profil →</Text>
            </View>
            <Text style={styles.proChevron}>›</Text>
          </TouchableOpacity>

          {(pro.status === 'new_teacher' || pro.status === 'under_review') && (
            <View style={[styles.trustBanner, { borderLeftColor: getCategoryColor(cls.category) }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>Nouveau sur Koureo</Text>
                <Text style={styles.trustText}>
                  Cours gratuit · Évaluation après la session
                </Text>
              </View>
              <TeacherBadge status={pro.status} small />
            </View>
          )}

          {/* Info chips — modern capsules */}
          <View style={styles.chipRow}>
            <View style={styles.infoChip}>
              <Text style={styles.chipValue}>{formatDuration(cls.durationMinutes)}</Text>
              <Text style={styles.chipLabel}>Durée</Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.chipValue}>{levelLabel}</Text>
              <Text style={styles.chipLabel}>Niveau</Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.chipValue}>{distanceLabel}</Text>
              <Text style={styles.chipLabel}>Distance</Text>
            </View>
          </View>

          {!isIndividual && nextSession && (
            <View style={styles.capacitySection}>
              <CapacityBar
                booked={nextSession.bookedCount}
                max={nextSession.maxParticipants}
                label="Prochaine session"
              />
            </View>
          )}

          {/* Products (abos, packs, unité) — discoverable before reserving */}
          {products.length > 0 && (
            <View style={styles.section}>
              <View style={offerStyles.offersHeader}>
                <Text style={styles.sectionTitle}>
                  Prendre un abonnement ou un pack
                </Text>
                {creditBalance > 0 && (
                  <Badge
                    label={`Tu as ${creditBalance} crédit${creditBalance > 1 ? 's' : ''}`}
                    variant="success"
                    small
                  />
                )}
              </View>
              <Text style={offerStyles.offersHint}>
                Paye moins cher ce cours (et les suivants) en achetant un pack
                ou un abonnement chez {pro.displayName}.
              </Text>
              {products.map((p) => (
                <CourseProductOfferCard
                  key={p.id}
                  product={p}
                  onPress={() =>
                    navigation.navigate('ProductCheckout', { productId: p.id })
                  }
                />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.description}>{cls.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lieu</Text>
            {(() => {
              const user = authService.getCurrentUser();
              const userBookings = user ? bookingsService.listForUser(user.id) : [];
              const booked = hasConfirmedBooking(user?.id ?? '', pro.id, userBookings);
              return booked ? (
                <View style={styles.addressCard}>
                  <Text style={styles.addressIcon}>◆</Text>
                  <Text style={styles.addressText}>{pro.address}</Text>
                </View>
              ) : (
                <View style={styles.addressCardMasked}>
                  <View style={styles.addressMaskedTop}>
                    <Text style={styles.addressIcon}>◆</Text>
                    <Text style={styles.addressText}>{maskAddress(pro.address, pro.latitude, pro.longitude)}</Text>
                  </View>
                  <View style={styles.addressMaskedNotice}>
                    <Text style={styles.addressNoticeText}>
                      L'adresse exacte sera communiquée après la réservation
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>

          <View style={styles.section}>
            <CancellationNotice hoursBefore={cls.cancellationHoursBefore} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.stickyBottom}>
        <View>
          <Text style={styles.priceSmall}>
            {cls.isFree ? 'Cours' : 'à partir de'}
          </Text>
          <Text style={[styles.priceBig, cls.isFree && { color: colors.success }]}>
            {cls.isFree ? 'Gratuit' : `${cls.price}€`}
          </Text>
        </View>
        <Button
          label={cls.isFree ? 'Réserver gratuitement' : 'Choisir un créneau'}
          onPress={() => navigation.navigate('SlotPicker', { courseId: cls.id })}
          fullWidth={false}
          style={{ paddingHorizontal: spacing.lg }}
        />
      </View>
    </View>
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

function CourseProductOfferCard({
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
  const subline =
    product.kind === 'single_class'
      ? "1 cours à l'unité"
      : product.kind === 'monthly_subscription'
        ? `${credits} crédit${credits > 1 ? 's' : ''} par mois · renouvelé chaque mois`
        : `${credits} crédit${credits > 1 ? 's' : ''} · valable ${product.validityDays ?? 90} jours`;
  return (
    <TouchableOpacity
      style={offerStyles.offerCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text style={offerStyles.offerIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={offerStyles.offerBadge}>{label}</Text>
        <Text style={offerStyles.offerName} numberOfLines={1}>{product.name}</Text>
        <Text style={offerStyles.offerSub}>{subline}</Text>
      </View>
      <View style={offerStyles.offerRight}>
        <Text style={offerStyles.offerPrice}>{product.price.toFixed(0)}€</Text>
        {unit !== '' && <Text style={offerStyles.offerUnit}>{unit}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const offerStyles = StyleSheet.create({
  offersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  offersHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: spacing.md,
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
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  imageContainer: { width, height: IMAGE_HEIGHT },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heartButton: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  backText: { fontSize: 20, color: colors.text },
  imageOverlay: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
  },
  content: {
    padding: spacing.lg,
    marginTop: -spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.md, letterSpacing: -0.5 },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  proAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md },
  proInfo: { flex: 1 },
  proName: { fontSize: 16, fontWeight: '700', color: colors.text },
  proNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  proLink: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  proChevron: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    gap: spacing.md,
  },
  trustTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  trustText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  star: { fontSize: 14, color: colors.accent },
  rating: { fontSize: 13, color: colors.textSecondary },
  // Info chips
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoChip: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  capacitySection: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  description: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  addressIcon: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  addressText: { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
  addressCardMasked: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  addressMaskedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  addressMaskedNotice: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addressNoticeText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSmall: { fontSize: 11, color: colors.textLight, fontWeight: '500', letterSpacing: 0.3 },
  priceBig: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
});
