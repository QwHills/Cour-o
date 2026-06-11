import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { teachersService } from '../../services/teachers.service';
import { useCurrentTeacherId } from '../../hooks/useCurrentTeacher';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Button from '../../components/ui/Button';

// Mock image URLs for the "upload" feature
const MOCK_PHOTOS = {
  place: [
    'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    'https://images.unsplash.com/photo-1607435097405-db48f377bff6?w=800&q=80',
  ],
  self: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
  ],
  activity: [
    'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  ],
};

// Larger pool used to seed the optional gallery — picked at random when the
// teacher taps "Ajouter une photo". Skips any URL already in the gallery so
// repeated taps never create duplicates.
const GALLERY_POOL = [
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=80',
  'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=900&q=80',
  'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=900&q=80',
  'https://images.unsplash.com/photo-1612203985729-70726954388c?w=900&q=80',
  'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=900&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=900&q=80',
  'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=900&q=80',
];

const GALLERY_MAX = 8;

type PhotoKey = 'place' | 'self' | 'activity';

export default function TeacherPhotosScreen() {
  const navigation = useNavigation();
  const teacherId = useCurrentTeacherId();
  const teacher = teacherId ? teachersService.getById(teacherId) : undefined;

  const [photos, setPhotos] = useState({
    place: teacher?.photos?.place ?? '',
    self: teacher?.photos?.self ?? '',
    activity: teacher?.photos?.activity ?? '',
  });
  const [gallery, setGallery] = useState<string[]>(teacher?.photos?.gallery ?? []);

  // Re-hydrate when the teacher resolves (useCurrentTeacherId is async on
  // first mount — the initial useState pass runs before the cache is ready).
  useEffect(() => {
    if (teacher?.photos) {
      setPhotos({
        place: teacher.photos.place ?? '',
        self: teacher.photos.self ?? '',
        activity: teacher.photos.activity ?? '',
      });
      setGallery(teacher.photos.gallery ?? []);
    }
  }, [teacher?.photos?.place, teacher?.photos?.self, teacher?.photos?.activity, teacher?.photos?.gallery]);

  const handleAddGalleryPhoto = () => {
    if (gallery.length >= GALLERY_MAX) return;
    // Pick the first pool URL not already in the gallery so taps cycle through
    // distinct images.
    const next = GALLERY_POOL.find((u) => !gallery.includes(u));
    if (next) setGallery([...gallery, next]);
  };

  const handleRemoveGalleryPhoto = (url: string) => {
    setGallery((g) => g.filter((u) => u !== url));
  };

  const handleMockPick = (key: PhotoKey) => {
    const opts = MOCK_PHOTOS[key];
    const current = photos[key];
    // Cycle to next mock photo or pick first
    const idx = opts.indexOf(current);
    const next = opts[(idx + 1) % opts.length];
    setPhotos({ ...photos, [key]: next });
  };

  const handleSave = async () => {
    if (!teacherId) {
      Alert.alert('Erreur', 'Profil prof non chargé. Réessaie dans un instant.');
      return;
    }
    await teachersService.updatePhotos(teacherId, { ...photos, gallery });
    const complete = !!(photos.place && photos.self && photos.activity);
    Alert.alert(
      complete ? 'Photos enregistrées ✓' : 'Photos partielles',
      complete
        ? "Parfait ! Tu peux maintenant créer tes offres de cours."
        : "Tu dois ajouter les 3 photos avant de pouvoir créer une offre.",
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const completed = [photos.place, photos.self, photos.activity].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes photos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Ajoute 3 photos</Text>
        <Text style={styles.subtitle}>
          Ces photos seront visibles par les participants sur ton profil public.
          Elles sont obligatoires pour créer des offres de cours.
        </Text>

        {/* Progress */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completed / 3) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{completed}/3</Text>
        </View>

        <PhotoSlot
          label="Photo du lieu"
          hint="Où se déroulent tes cours"
          emoji="◆"
          value={photos.place}
          onPress={() => handleMockPick('place')}
        />

        <PhotoSlot
          label="Photo de toi"
          hint="Pour que les participants te reconnaissent"
          emoji="○"
          value={photos.self}
          onPress={() => handleMockPick('self')}
        />

        <PhotoSlot
          label="Photo de l'activité"
          hint="Une photo qui montre ton cours en action"
          emoji="✦"
          value={photos.activity}
          onPress={() => handleMockPick('activity')}
        />

        {/* Optional gallery of additional realization photos */}
        <View style={styles.galleryHeader}>
          <Text style={styles.galleryTitle}>Photos supplémentaires</Text>
          <Text style={styles.galleryCount}>
            {gallery.length}/{GALLERY_MAX}
          </Text>
        </View>
        <Text style={styles.gallerySubtitle}>
          Optionnel — montre tes réalisations, les coulisses ou différents moments du cours.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.galleryRow}
        >
          {gallery.map((url) => (
            <View key={url} style={styles.galleryThumb}>
              <Image source={{ uri: url }} style={styles.galleryImage} />
              <TouchableOpacity
                style={styles.galleryRemove}
                activeOpacity={0.85}
                onPress={() => handleRemoveGalleryPhoto(url)}
                hitSlop={8}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
          {gallery.length < GALLERY_MAX && (
            <TouchableOpacity
              style={[styles.galleryThumb, styles.galleryAdd]}
              activeOpacity={0.85}
              onPress={handleAddGalleryPhoto}
            >
              <Ionicons name="add" size={28} color={colors.proAccent} />
              <Text style={styles.galleryAddText}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Conseils pour de belles photos</Text>
          <Text style={styles.tipText}>
            • Privilégie la lumière naturelle{'\n'}
            • Cadre net et professionnel{'\n'}
            • Montre l'ambiance de tes cours{'\n'}
            • Évite les photos floues ou trop sombres
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={completed === 3 ? 'Enregistrer mes photos' : `Il te manque ${3 - completed} photo${3 - completed > 1 ? 's' : ''}`}
          variant="pro"
          onPress={handleSave}
        />
      </View>
    </View>
  );
}

function PhotoSlot({
  label,
  hint,
  emoji,
  value,
  onPress,
}: {
  label: string;
  hint: string;
  emoji: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.slot, value && styles.slotFilled]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {value ? (
        <>
          <Image source={{ uri: value }} style={styles.slotImage} />
          <View style={styles.slotOverlay}>
            <Text style={styles.slotOverlayText}>Modifier</Text>
          </View>
          <View style={styles.slotCheck}>
            <Text style={styles.slotCheckText}>✓</Text>
          </View>
        </>
      ) : (
        <View style={styles.slotEmpty}>
          <Text style={styles.slotEmoji}>{emoji}</Text>
          <Text style={styles.slotLabel}>{label}</Text>
          <Text style={styles.slotHint}>{hint}</Text>
          <View style={styles.slotPlus}>
            <Text style={styles.slotPlusText}>+</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.proAccent,
    borderRadius: radii.full,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.proAccent,
  },
  slot: {
    height: 200,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  slotFilled: {
    borderStyle: 'solid',
    borderColor: colors.success,
  },
  slotEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  slotEmoji: {
    fontSize: 28,
    color: colors.proAccent,
    marginBottom: spacing.sm,
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  slotHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slotPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotPlusText: { fontSize: 22, color: colors.proAccent, fontWeight: '300' },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(26,23,20,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  slotOverlayText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  slotCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotCheckText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Gallery (optional extra photos shown to students on the class hero)
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  galleryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  galleryCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.proAccent,
  },
  gallerySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  galleryRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
    marginBottom: spacing.md,
  },
  galleryThumb: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    position: 'relative',
  },
  galleryImage: { width: '100%', height: '100%' },
  galleryRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(26,23,20,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryAdd: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  galleryAddText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.proAccent,
  },

  tip: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
