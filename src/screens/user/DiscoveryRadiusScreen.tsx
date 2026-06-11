// Profil → Rayon de recherche
//
// Lets the student fine-tune how far around their geolocation we surface
// activities, promotions and favorites. Useful in rural areas where 5 km is
// too restrictive, and in dense cities where a tighter radius keeps the
// feed relevant.
//
// Values are persisted via `userPreferencesService` (AsyncStorage today;
// movable to Supabase `user_preferences` later).

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import {
  userPreferencesService,
  DiscoveryRadii,
  DEFAULT_RADII,
} from '../../services/userPreferences.service';

// Preset chips per radius — Tight / Local / Wide / Region.
// Promotions go down to 500 m (0.5 km) for dense city blocks.
const ACTIVITY_PRESETS = [5, 15, 30, 50];
const PROMO_PRESETS = [0.5, 2, 5, 15];
const FAV_PRESETS = [5, 15, 30, 50];

// Display helper: render sub-kilometre values as "500 m" so the chip /
// hero number reads naturally instead of "0.5 km".
function formatRadius(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  // Preserve a single decimal when present (e.g. "1.5 km"), drop trailing
  // ".0" so whole kilometres display as "30 km" not "30.0 km".
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} km` : `${rounded.toFixed(1)} km`;
}

export default function DiscoveryRadiusScreen() {
  const navigation = useNavigation<any>();
  const [r, setR] = useState<DiscoveryRadii>(userPreferencesService.get());

  // Make sure we start from the persisted (not in-memory default) value.
  useEffect(() => {
    userPreferencesService.hydrate().then(setR);
  }, []);

  const update = (patch: Partial<DiscoveryRadii>) => {
    userPreferencesService.update(patch).then(setR);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rayon de recherche</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Choisis jusqu'où autour de toi tu veux voir les activités, les
          promotions et tes favoris. Utile si tu habites loin d'une grande
          ville — élargis pour que la map se remplisse.
        </Text>

        <Picker
          icon="search"
          tint={colors.primary}
          bg="rgba(67,196,176,0.14)"
          label="Activités"
          desc="Distance maximale pour les cours dans la carrousel et l'accueil."
          value={r.activitiesKm}
          presets={ACTIVITY_PRESETS}
          onChange={(km) => update({ activitiesKm: km })}
        />

        <Picker
          icon="flash"
          tint="#E89579"
          bg="rgba(232,149,121,0.16)"
          label="Promotions"
          desc="Les promotions s'affichent autour de toi (et toujours pour tes favoris)."
          value={r.promotionsKm}
          presets={PROMO_PRESETS}
          onChange={(km) => update({ promotionsKm: km })}
        />

        <Picker
          icon="heart"
          tint="#C8649C"
          bg="rgba(200,100,156,0.14)"
          label="Favoris"
          desc="Les cours favoris à plus loin que ça n'apparaissent pas dans ta liste."
          value={r.favoritesKm}
          presets={FAV_PRESETS}
          onChange={(km) => update({ favoritesKm: km })}
        />

        <TouchableOpacity
          style={styles.resetBtn}
          activeOpacity={0.85}
          onPress={() =>
            userPreferencesService.update(DEFAULT_RADII).then(setR)
          }
        >
          <Ionicons name="refresh" size={16} color={colors.textSecondary} />
          <Text style={styles.resetText}>Réinitialiser aux valeurs par défaut</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Picker({
  icon, tint, bg, label, desc, value, presets, onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  label: string;
  desc: string;
  value: number;
  presets: number[];
  onChange: (km: number) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={20} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
        <Text style={[styles.cardValue, { color: tint }]}>{formatRadius(value)}</Text>
      </View>
      <View style={styles.chipsRow}>
        {presets.map((km) => {
          // Compare with a small tolerance so "0.5" stored value matches the
          // 0.5 preset chip even after a JSON round-trip through AsyncStorage.
          const active = Math.abs(km - value) < 0.05;
          return (
            <TouchableOpacity
              key={km}
              style={[styles.chip, active && { backgroundColor: bg, borderColor: tint }]}
              activeOpacity={0.85}
              onPress={() => onChange(km)}
            >
              <Text style={[styles.chipText, active && { color: tint, fontWeight: '800' }]}>
                {formatRadius(km)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
