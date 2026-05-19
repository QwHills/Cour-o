import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../services/auth.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const user = authService.getCurrentUser();

  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState('Rennes');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
  const [uploading, setUploading] = useState(false);

  const handlePickAvatar = async () => {
    // Ask permission first — Expo handles the OS prompt for us.
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Accès aux photos refusé',
        "Active l'accès à tes photos dans les Réglages pour pouvoir changer ton avatar.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      setUploading(true);
      const url = await authService.uploadAvatar(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      setAvatarUrl(url);
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      console.warn('Avatar upload failed:', e);
      Alert.alert('Échec de l\'upload', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (name.trim()) {
      authService.updateName(name.trim());
    }
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
        <Text style={styles.headerTitle}>Modifier mon profil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={handlePickAvatar} disabled={uploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {name.charAt(0).toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.avatarEdit}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.avatarEditText}>✎</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>
            {uploading ? 'Envoi en cours…' : 'Changer la photo'}
          </Text>
        </View>

        <Input
          label="Prénom"
          placeholder="Ton prénom"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Input
          label="Email"
          value={user?.email ?? ''}
          editable={false}
          hint="L'email ne peut pas être modifié"
        />

        <Input
          label="Ville"
          placeholder="Rennes, Paris, Lyon…"
          value={city}
          onChangeText={setCity}
        />

        <Input
          label="Bio (optionnel)"
          placeholder="Parle un peu de toi, ce que tu aimes…"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 80 }}
        />
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label="Enregistrer"
          onPress={handleSave}
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  avatarEditText: {
    fontSize: 16,
    color: colors.text,
  },
  avatarHint: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
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
