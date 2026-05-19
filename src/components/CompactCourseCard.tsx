// Compact card used in the Explorer bottom sheet (2 stacked horizontal rows).
// Design target: ~130px tall vs ~260px for the full CourseCard.
// Layout: 92px square image on the left · text block on the right · favorite top-right.

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors, spacing, radii, shadows } from '../theme/theme';
import { EnrichedCourse } from '../services/courses.service';
import { formatTimeLabel, formatDateLabel } from '../utils/date';
import { getCategoryColor } from '../utils/categoryIcons';
import { isPromoLive } from '../types/domain';
import FavoriteButton from './FavoriteButton';

// Match the phone mockup width on web, use real screen on native
const CARD_WIDTH = Math.min(Dimensions.get('window').width, 390) * 0.72;

interface Props {
  course: EnrichedCourse;
  onPress: () => void;
}

export default function CompactCourseCard({ course, onPress }: Props) {
  const { class: cls, teacher, nextSession, distanceLabel } = course;
  const catColor = getCategoryColor(cls.category);
  const isNew = teacher?.status === 'new_teacher';
  const promo = !!nextSession && isPromoLive(nextSession) && typeof nextSession.promoPrice === 'number';
  const promoPct = promo && cls.price > 0
    ? Math.round((1 - (nextSession!.promoPrice as number) / cls.price) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: cls.imageUrl }} style={styles.image} />
        {promo && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>
              {promoPct > 0 ? `-${promoPct}%` : 'PROMO'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.catPill, { backgroundColor: catColor + '22' }]}>
            <Text style={[styles.catText, { color: catColor }]} numberOfLines={1}>
              {cls.category}
            </Text>
          </View>
          <FavoriteButton classId={cls.id} size="sm" />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {cls.title}
        </Text>

        {teacher && (
          <Text style={styles.teacher} numberOfLines={1}>
            {teacher.displayName}
            {isNew && <Text style={styles.newTag}> · Nouveau</Text>}
          </Text>
        )}

        <View style={styles.bottomRow}>
          {nextSession && (
            <Text style={styles.meta} numberOfLines={1}>
              {formatDateLabel(nextSession.startsAt)} · {formatTimeLabel(nextSession.startsAt)}
            </Text>
          )}
          {cls.isFree ? (
            <Text style={styles.price}>Gratuit</Text>
          ) : promo ? (
            <View style={styles.priceCol}>
              <Text style={styles.priceStrike}>{cls.price}€</Text>
              <Text style={[styles.price, styles.pricePromo]}>{nextSession!.promoPrice}€</Text>
            </View>
          ) : (
            <Text style={styles.price}>{cls.price}€</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 118,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  imageWrap: { width: 118, height: '100%', position: 'relative' },
  image: {
    width: 118,
    height: '100%',
  },
  promoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: '75%',
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  teacher: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newTag: {
    color: colors.proAccent,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 2,
  },
  meta: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  priceCol: { alignItems: 'flex-end' },
  priceStrike: {
    fontSize: 10,
    color: colors.textLight,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  pricePromo: { color: colors.primary },
});

export const COMPACT_CARD_WIDTH = CARD_WIDTH;
