import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getTeacherById, updateTeacher } from '../../data/mockTeachers';
import { VatRegime } from '../../types/domain';
import { invoiceService } from '../../services/invoice.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import VatRegimeSelector from '../../components/VatRegimeSelector';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';

export default function VatSettingsScreen() {
  const navigation = useNavigation();
  const teacher = getTeacherById(DEMO_TEACHER_ID)!;
  const billing = teacher.billingConfig ?? {
    vatRegime: 'non_assujetti' as VatRegime,
    legalName: teacher.displayName,
    address: teacher.address,
  };

  const [regime, setRegime] = useState<VatRegime>(billing.vatRegime);
  const [legalName, setLegalName] = useState(billing.legalName);
  const [siret, setSiret] = useState(billing.siret ?? '');
  const [vatNumber, setVatNumber] = useState(billing.vatNumber ?? '');
  const [address, setAddress] = useState(billing.address);

  const handleSave = () => {
    updateTeacher(DEMO_TEACHER_ID, {
      billingConfig: {
        vatRegime: regime,
        legalName,
        siret: siret || undefined,
        vatNumber: regime === 'tva_20' ? vatNumber || undefined : undefined,
        address,
      },
    });
    Alert.alert('Enregistré ✓', 'Ta configuration TVA a été mise à jour.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facturation & TVA</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>Régime de TVA</Text>
        <Text style={styles.sectionHint}>
          Choisis le régime qui correspond à ta situation. Cela détermine le contenu de tes factures.
        </Text>

        <VatRegimeSelector value={regime} onChange={setRegime} />

        {/* Legal mention preview */}
        <Card style={styles.previewCard}>
          <Text style={styles.previewLabel}>Mention sur tes factures</Text>
          <Text style={styles.previewText}>
            {regime === 'non_assujetti' && 'TVA non applicable, art. 293 B du CGI'}
            {regime === 'tva_20' && 'TVA 20%'}
            {regime === 'exonere_formation' && "Exonération de TVA, art. 261-4-4° du CGI"}
          </Text>
        </Card>

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          Informations légales
        </Text>

        <Input
          label="Raison sociale / Nom"
          placeholder="Sophie Martin"
          value={legalName}
          onChangeText={setLegalName}
        />
        <Input
          label="SIRET"
          placeholder="123 456 789 00012"
          value={siret}
          onChangeText={setSiret}
          keyboardType="numeric"
        />
        {regime === 'tva_20' && (
          <Input
            label="N° TVA intracommunautaire"
            placeholder="FR12345678901"
            value={vatNumber}
            onChangeText={setVatNumber}
          />
        )}
        <Input
          label="Adresse de facturation"
          placeholder="8 Place de la République, 35000 Rennes"
          value={address}
          onChangeText={setAddress}
        />
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label="Enregistrer"
          variant="pro"
          onPress={handleSave}
        />
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
  back: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 140 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  previewCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.proAccent,
    fontStyle: 'italic',
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
