import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoiceService } from '../../services/invoice.service';
import { bookingsService } from '../../services/bookings.service';
import { Invoice } from '../../types/domain';
import { colors, spacing, radii, shadows } from '../../theme/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const DEMO_TEACHER_ID = '22222222-2222-2222-2222-222222222003';

export default function InvoicesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [, setTick] = useState(0);
  useEffect(() => invoiceService.onChange(() => setTick((t) => t + 1)), []);

  // Generate invoices for all paid bookings of this teacher
  useEffect(() => {
    const bookings = bookingsService.listForTeacher(DEMO_TEACHER_ID);
    for (const b of bookings) {
      if (!b.isFree && !invoiceService.getForBooking(b.id)) {
        invoiceService.generateInvoice(b, 'Client Demo', 'demo@koureo.fr').catch(() => {});
      }
    }
  }, []);

  const invoices = invoiceService.getForTeacher(DEMO_TEACHER_ID);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes factures</Text>
        <View style={{ width: 24 }} />
      </View>

      {invoices.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>Aucune facture</Text>
          <Text style={styles.emptyText}>
            Tes factures seront générées automatiquement après chaque cours payant.
          </Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
            >
              <Card style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>📄</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardNum}>{item.invoiceNumber}</Text>
                    <Text style={styles.cardCourse}>{item.courseTitle}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.issuedAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>{item.priceTTC.toFixed(2)}€</Text>
                    <Badge
                      label={invoiceService.getVatShortLabel(item.vatRegime)}
                      variant="neutral"
                      small
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: { fontSize: 20 },
  cardInfo: { flex: 1 },
  cardNum: { fontSize: 13, fontWeight: '700', color: colors.text },
  cardCourse: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardDate: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: { fontSize: 15, fontWeight: '700', color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
