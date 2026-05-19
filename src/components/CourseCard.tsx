import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, shadows } from '../theme/theme';
import { EnrichedCourse } from '../services/courses.service';
import { formatTimeLabel, formatDateLabel } from '../utils/date';
import { getCategoryColor } from '../utils/categoryIcons';
import { isPromoLive } from '../types/domain';
import FavoriteButton from './FavoriteButton';

// Cap at 390px so cards stay phone-sized on web/desktop even though the
// browser window is much wider than the phone mockup.
const CARD_WIDTH = Math.min(Dimensions.get('window').width, 390) * 0.82;
const CARD_HEIGHT = 260;

interface CourseCardProps {
  course: EnrichedCourse;
  onPress: () => void;
}

export default function CourseCard({ course, onPress }: CourseCardProps) {
  const { class: cls, teacher, nextSession, distanceLabel, spotsLeft } = course;
  const isFull = nextSession ? nextSession.bookedCount >= nextSession.maxParticipants : false;
  const isTonight = nextSession && (() => {
    const d = new Date(nextSession.startsAt);
    const now = new Date();
    return d.toDateString() === now.toDateString() && d.getHours() >= 17;
  })();
  const isLowSpots = spotsLeft > 0 && spotsLeft <= 3 && !cls.isFree;
  const isNew = teacher?.status === 'new_teacher';
  const catColor = getCategoryColor(cls.category);
  const promo = !!nextSession && isPromoLive(nextSession) && typeof nextSession.promoPrice === 'number';
  const promoPct = promo && cls.price > 0
    ? Math.round((1 - (nextSession!.promoPrice as number) / cls.price) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Image */}
      <Image source={{ uri: cls.imageUrl }} style={styles.image} />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(26,23,20,0.0)', 'rgba(26,23,20,0.15)', 'rgba(26,23,20,0.8)']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      />

      {/* Top: category + contextual badge */}
      <View style={styles.topRow}>
        <View style={[styles.catPill, { backgroundColor: catColor }]}>
          <Text style={styles.catText}>{cls.category}</Text>
        </View>
        {/* Favorite heart — top right */}
        <FavoriteButton classId={cls.id} size="md" onDark />
      </View>

      {/* Context badges — second row */}
      {(isTonight || isNew) && (
        <View style={styles.secondRow}>
          {isTonight && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Ce soir</Text>
            </View>
          )}
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>Nouveau</Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom content */}
      <View style={styles.bottom}>
        {/* Title & teacher */}
        <Text style={styles.title} numberOfLines={1}>{cls.title}</Text>
        {teacher && (
          <Text style={styles.teacher}>
            {teacher.displayName}
            {teacher.rating > 0 ? `  ★ ${teacher.rating}` : ''}
          </Text>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          {nextSession && (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>
                {formatDateLabel(nextSession.startsAt)} · {formatTimeLabel(nextSession.startsAt)}
              </Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{distanceLabel}</Text>
          </View>
        </View>

        {/* Price + spots */}
        <View style={styles.footerRow}>
          {cls.isFree ? (
            <View style={styles.priceTagFree}>
              <Text style={styles.priceTextFree}>Gratuit</Text>
            </View>
          ) : promo ? (
            <View style={styles.priceTagPromo}>
              <Text style={styles.priceTextStrike}>{cls.price}€</Text>
              <Text style={styles.priceTextPromo}>{nextSession!.promoPrice}€</Text>
              {promoPct > 0 && (
                <View style={styles.promoPctChip}>
                  <Text style={styles.promoPctText}>-{promoPct}%</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{cls.price}€</Text>
            </View>
          )}

          {isLowSpots && (
            <View style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>
                {spotsLeft} place{spotsLeft > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullText}>Complet</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: '#1A1714',
    // Premium shadow
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Top row
  topRow: {
    position: 'absolute',
    top: spacing.md + 4,
    left: spacing.md + 4,
    right: spacing.md + 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  topBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  secondRow: {
    position: 'absolute',
    top: spacing.md + 4 + 36 + 8, // after top row (pill + heart) ~36 height + gap
    left: spacing.md + 4,
    flexDirection: 'row',
    gap: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,23,20,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B4A',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newBadge: {
    backgroundColor: 'rgba(201,169,110,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  newText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Bottom content
  bottom: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  teacher: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Meta chips
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  metaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  priceTag: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  priceTagFree: {
    backgroundColor: 'rgba(106,171,142,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  priceTextFree: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B8E8D0',
    letterSpacing: 0.3,
  },
  priceTagPromo: {
    backgroundColor: 'rgba(67,196,176,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceTextStrike: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  priceTextPromo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  promoPctChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  promoPctText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  urgencyBadge: {
    backgroundColor: 'rgba(67,196,176,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD4B8',
  },
  fullBadge: {
    backgroundColor: 'rgba(199,95,74,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  fullText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFB4A8',
  },
});
