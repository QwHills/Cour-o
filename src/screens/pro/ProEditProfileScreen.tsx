import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { teachersService } from '../../services/teachers.service';
import { useCurrentTeacher } from '../../hooks/useCurrentTeacher';
import { Category } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const ALL_CATEGORIES: Category[] = [
  'Yoga', 'Danse', 'Musique', 'Sport', 'Bien-être', 'Langues',
  'Créatif', 'Cuisine', 'Développement personnel', 'Enfants', 'Business',
];

export default function ProEditProfileScreen() {
  const navigation = useNavigation();
  // Hook resolves the real signed-in teacher from auth — the previous
  // hardcoded DEMO_TEACHER_ID meant every prof was editing Sophie's profile.
  const teacher = useCurrentTeacher();

  const [displayName, setDisplayName] = useState(teacher?.displayName ?? '');
  const [bio, setBio] = useState(teacher?.bio ?? '');
  const [categories, setCategories] = useState<Category[]>(teacher?.categories ?? []);

  // The teacher hook resolves async on first mount — re-hydrate the form
  // fields once we actually have a profile so they're not stuck empty.
  React.useEffect(() => {
    if (teacher) {
      setDisplayName(teacher.displayName ?? '');
      setBio(teacher.bio ?? '');
      setCategories(teacher.categories ?? []);
    }
  }, [teacher?.id, teacher?.displayName, teacher?.bio, teacher?.categories]);

  const toggleCategory = (cat: Category) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = () => {
    if (!teacher) {
      Alert.alert('Erreur', 'Profil prof non chargé. Réessaie dans un instant.');
      return;
    }
    teachersService.updateProfile(teacher.id, {
      displayName,
      bio,
      categories,
    });
    Alert.alert('Profil mis à jour ✓', '', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
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
        <Text style={styles.headerTitle}>Mon profil pro</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {teacher?.photoUrl && (
          <View style={styles.avatarSection}>
            <Image source={{ uri: teacher.photoUrl }} style={styles.avatar} />
            <Text style={styles.avatarHint}>Change ta photo dans « Mes photos »</Text>
          </View>
        )}

        <Input
          label="Nom affiché"
          placeholder="Comment te présenter aux participants"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />

        <Input
          label="Bio"
          placeholder="Parle de toi, de ton approche pédagogique…"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={{ minHeight: 120 }}
        />

        <Text style={styles.sectionLabel}>Catégories enseignées</Text>
        <View style={styles.catGrid}>
          {ALL_CATEGORIES.map((cat) => {
            const active = categories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.85}
              >
                <Text style={[styles.catText, active && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Button label="Enregistrer" variant="pro" onPress={handleSave} />
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  avatarSection: { alignItems: 'center', marginVertical: spacing.lg },
  avatar: { width: 92, height: 92, borderRadius: 46, ...shadows.sm },
  avatarHint: { fontSize: 12, color: colors.textLight, marginTop: spacing.sm },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  catChipActive: {
    backgroundColor: colors.proAccent,
    borderColor: colors.proAccent,
  },
  catText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  catTextActive: { color: '#FFFFFF', fontWeight: '600' },
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
