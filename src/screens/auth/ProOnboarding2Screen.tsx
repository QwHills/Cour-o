import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Category } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const ALL_CATEGORIES: Category[] = [
  'Yoga', 'Danse', 'Musique', 'Sport', 'Bien-être', 'Langues',
  'Créatif', 'Cuisine', 'Développement personnel', 'Enfants', 'Business',
];

export default function ProOnboarding2Screen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { name: userName, email, password, kind, isUpgrade } = route.params ?? {};
  const displayName = userName ?? 'Professeur';

  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showOther, setShowOther] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');

  const toggleCategory = (cat: Category) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleNext = () => {
    if (categories.length === 0 && !otherCategory.trim()) {
      Alert.alert('', 'Sélectionne au moins une catégorie.');
      return;
    }
    const allCats = [...categories];
    if (otherCategory.trim()) {
      allCats.push(otherCategory.trim() as Category);
    }
    navigation.navigate('ProOnboarding3', {
      name: userName,
      email,
      password,
      kind,
      bio,
      categories: allCats,
      isUpgrade,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.step}>Étape 3/4</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Ton profil</Text>
        <Text style={styles.subtitle}>
          Fais bonne impression ! Ces infos seront visibles par les participants.
        </Text>

        {/* Photo placeholder */}
        <TouchableOpacity style={styles.photoPlaceholder} activeOpacity={0.8}>
          <Text style={styles.photoEmoji}>📸</Text>
          <Text style={styles.photoText}>Ajouter une photo</Text>
        </TouchableOpacity>

        {/* Name (read-only, from signup) */}
        <View style={styles.nameCard}>
          <Text style={styles.nameLabel}>Nom affiché</Text>
          <Text style={styles.nameValue}>{displayName}</Text>
        </View>

        <Input
          label="Bio"
          placeholder="Parle de toi, de ton expérience, de ce qui te passionne…"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />

        <Text style={styles.sectionLabel}>Qu'est-ce que tu enseignes ?</Text>
        <Text style={styles.sectionHint}>Sélectionne une ou plusieurs catégories</Text>

        <View style={styles.categoryGrid}>
          {ALL_CATEGORIES.map((cat) => {
            const isActive = categories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Chip "Autre" */}
          <TouchableOpacity
            style={[styles.categoryChip, showOther && styles.categoryChipActive]}
            onPress={() => setShowOther(!showOther)}
            activeOpacity={0.8}
          >
            <Text style={[styles.categoryText, showOther && styles.categoryTextActive]}>
              + Autre
            </Text>
          </TouchableOpacity>
        </View>

        {showOther && (
          <View style={styles.otherInput}>
            <Input
              label="Précise ta catégorie"
              placeholder="Ex: Photographie, Couture, Échecs…"
              value={otherCategory}
              onChangeText={setOtherCategory}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label="Continuer"
          onPress={handleNext}
          disabled={categories.length === 0}
        />
      </View>
    </KeyboardAvoidingView>
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
  step: { fontSize: 12, fontWeight: '600', color: colors.textLight, letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  photoEmoji: { fontSize: 28, marginBottom: 4 },
  photoText: { fontSize: 10, fontWeight: '600', color: colors.textLight, letterSpacing: 0.3 },
  nameCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  nameLabel: { fontSize: 11, fontWeight: '600', color: colors.textLight, letterSpacing: 0.5, marginBottom: 4 },
  nameValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  otherInput: {
    marginTop: spacing.md,
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
