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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getTeacherById } from '../../data/mockTeachers';
import { teachersService } from '../../services/teachers.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';

const ZONE_OPTIONS = [
  { label: 'Mon adresse uniquement', value: 0 },
  { label: 'Dans un rayon de 5 km', value: 5 },
  { label: 'Dans un rayon de 10 km', value: 10 },
  { label: 'Dans un rayon de 20 km', value: 20 },
  { label: 'Partout en France', value: 9999 },
];

export default function AddressZoneScreen() {
  const navigation = useNavigation();
  const teacher = getTeacherById(DEMO_TEACHER_ID);
  const [address, setAddress] = useState(teacher?.address ?? '');
  const [zone, setZone] = useState(5);

  const handleSave = () => {
    teachersService.updateProfile(DEMO_TEACHER_ID, { address });
    Alert.alert('Adresse enregistrée ✓', '', [
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
        <Text style={styles.headerTitle}>Adresse & zone</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Adresse de tes cours</Text>
        <Text style={styles.sectionHint}>
          Cette adresse ne sera visible qu'après la réservation d'un participant.
          Avant, seul le quartier apparaît sur la carte.
        </Text>

        <Input
          label="Adresse complète"
          placeholder="15 Rue de la Monnaie, 35000 Rennes"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
          Zone de déplacement
        </Text>
        <Text style={styles.sectionHint}>
          Si tu peux te déplacer chez les participants, indique ta zone maximale.
        </Text>

        <Card style={styles.zoneCard} padding="none">
          {ZONE_OPTIONS.map((opt, idx) => {
            const active = zone === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.zoneRow, idx < ZONE_OPTIONS.length - 1 && styles.zoneRowBorder]}
                onPress={() => setZone(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.zoneLabel}>{opt.label}</Text>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  zoneCard: { overflow: 'hidden' },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  zoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  zoneLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: colors.proAccent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.proAccent },
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
