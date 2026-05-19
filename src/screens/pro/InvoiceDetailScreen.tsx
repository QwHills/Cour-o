import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { invoiceService } from '../../services/invoice.service';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Button from '../../components/ui/Button';

export default function InvoiceDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { invoiceId } = route.params;

  // Find invoice from all teacher invoices
  const allTeacher = invoiceService.getForTeacher('22222222-2222-2222-2222-222222222003');
  const allUser = invoiceService.getForUser('u_demo');
  const invoice = [...allTeacher, ...allUser].find((i) => i.id === invoiceId);

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Text>Facture introuvable</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facture</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Invoice card — styled like a real invoice */}
        <View style={styles.invoiceCard}>
          {/* Header */}
          <View style={styles.invoiceHeader}>
            <Text style={styles.brand}>KOUREO</Text>
            <View style={styles.invoiceNumBlock}>
              <Text style={styles.invoiceNumLabel}>Facture</Text>
              <Text style={styles.invoiceNum}>{invoice.invoiceNumber}</Text>
            </View>
          </View>

          <Text style={styles.issuedDate}>
            Émise le {new Date(invoice.issuedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          <View style={styles.divider} />

          {/* Parties */}
          <View style={styles.partiesRow}>
            <View style={styles.party}>
              <Text style={styles.partyLabel}>DE</Text>
              <Text style={styles.partyName}>{invoice.teacherName}</Text>
              {invoice.teacherSiret && (
                <Text style={styles.partyDetail}>SIRET {invoice.teacherSiret}</Text>
              )}
              <Text style={styles.partyDetail}>{invoice.teacherAddress}</Text>
              {invoice.teacherVatNumber && (
                <Text style={styles.partyDetail}>TVA {invoice.teacherVatNumber}</Text>
              )}
            </View>
            <View style={styles.party}>
              <Text style={styles.partyLabel}>POUR</Text>
              <Text style={styles.partyName}>{invoice.participantName}</Text>
              <Text style={styles.partyDetail}>{invoice.participantEmail}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Line items */}
          <View style={styles.lineHeader}>
            <Text style={[styles.lineHeaderText, { flex: 1 }]}>Description</Text>
            <Text style={styles.lineHeaderText}>Montant</Text>
          </View>

          <View style={styles.lineItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{invoice.courseTitle}</Text>
              <Text style={styles.lineDesc}>
                {invoice.courseDate} · {invoice.courseDuration}
              </Text>
            </View>
            <Text style={styles.lineAmount}>
              {invoice.priceHT.toFixed(2)}€
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total HT</Text>
            <Text style={styles.totalValue}>{invoice.priceHT.toFixed(2)}€</Text>
          </View>

          {invoice.vatRate > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA ({Math.round(invoice.vatRate * 100)}%)</Text>
              <Text style={styles.totalValue}>{invoice.vatAmount.toFixed(2)}€</Text>
            </View>
          ) : null}

          <View style={[styles.totalRow, styles.totalRowBig]}>
            <Text style={styles.totalLabelBig}>Total TTC</Text>
            <Text style={styles.totalValueBig}>{invoice.priceTTC.toFixed(2)}€</Text>
          </View>

          <View style={styles.dividerLight} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabelMuted}>Commission Koureo</Text>
            <Text style={styles.totalValueMuted}>-{invoice.commissionHT.toFixed(2)}€</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Net versé au professeur</Text>
            <Text style={[styles.totalValue, { color: colors.proAccent }]}>
              {invoice.teacherNetAmount.toFixed(2)}€
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Legal mentions */}
          <Text style={styles.legalMention}>{invoice.vatMention}</Text>
          <Text style={styles.legalMention}>Paiement par carte bancaire via Koureo</Text>
          <Text style={styles.legalMention}>
            Koureo SAS · Plateforme de réservation de cours
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label="Télécharger PDF"
          icon="📄"
          variant="secondary"
          onPress={() => Alert.alert('Bientôt disponible', 'Le téléchargement PDF sera disponible dans la version finale.')}
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
  scrollContent: { padding: spacing.lg, paddingBottom: 120 },

  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  brand: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 6,
  },
  invoiceNumBlock: { alignItems: 'flex-end' },
  invoiceNumLabel: { fontSize: 10, color: colors.textLight, letterSpacing: 0.5, fontWeight: '500' },
  invoiceNum: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  issuedDate: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  dividerLight: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },

  partiesRow: { flexDirection: 'row', gap: spacing.lg },
  party: { flex: 1 },
  partyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  partyName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  partyDetail: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  lineHeader: { flexDirection: 'row', marginBottom: spacing.sm },
  lineHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  lineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  lineTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  lineDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  lineAmount: { fontSize: 14, fontWeight: '700', color: colors.text },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 13, color: colors.text },
  totalValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  totalRowBig: { paddingVertical: spacing.sm, marginTop: spacing.xs },
  totalLabelBig: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalValueBig: { fontSize: 18, fontWeight: '700', color: colors.text },
  totalLabelMuted: { fontSize: 12, color: colors.textLight },
  totalValueMuted: { fontSize: 12, color: colors.textLight, fontWeight: '500' },

  legalMention: {
    fontSize: 11,
    color: colors.textLight,
    lineHeight: 17,
    marginBottom: 2,
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
