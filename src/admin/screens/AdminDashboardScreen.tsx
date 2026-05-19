import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminLayout from '../components/AdminLayout';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { adminSpacing, adminColors, adminTypography } from '../theme/adminTheme';

// Placeholder Phase 0 — sera rempli avec les vraies données Supabase en Phase 1.
// On affiche déjà la grille de KPIs et l'emplacement des graphes pour valider
// le layout, les composants réutilisables, et la cohérence visuelle.

export default function AdminDashboardScreen() {
  return (
    <AdminLayout
      title="Dashboard général"
      subtitle="Vue d'ensemble de l'activité Koureo · 7 derniers jours"
    >
      {/* KPI grid */}
      <View style={styles.statsGrid}>
        <StatCard label="CA total" value="—" hint="connexion DB en cours" icon="cash-outline" />
        <StatCard label="Commission Koureo" value="—" hint="12% de chaque résa" icon="trending-up-outline" />
        <StatCard label="Réservations" value="—" hint="période sélectionnée" icon="bookmark-outline" />
        <StatCard label="Cours publiés" value="—" hint="actifs uniquement" icon="calendar-outline" />
        <StatCard label="Profs actifs" value="—" hint="dernière connexion < 30j" icon="school-outline" />
        <StatCard label="Élèves inscrits" value="—" hint="total plateforme" icon="people-outline" />
        <StatCard label="Taux de remplissage" value="—" hint="moyenne pondérée" icon="pie-chart-outline" />
        <StatCard label="Points distribués" value="—" hint="ce mois-ci" icon="gift-outline" />
        <StatCard label="Dépenses" value="—" hint="ce mois-ci" icon="card-outline" />
        <StatCard label="Résultat net estimé" value="—" hint="commissions − dépenses" icon="analytics-outline" />
      </View>

      {/* Charts row */}
      <View style={styles.row}>
        <ChartCard title="Évolution du chiffre d'affaires" subtitle="Sur 30 jours" height={260} />
        <ChartCard title="Évolution des réservations" subtitle="Sur 30 jours" height={260} />
        <ChartCard title="Top catégories" subtitle="Volume de résas" height={260} />
      </View>

      {/* Tables row : top profs + alertes */}
      <View style={styles.row}>
        <View style={styles.panel}>
          <Text style={adminTypography.sectionTitle}>Top 5 profs (CA généré)</Text>
          <Text style={styles.placeholder}>Connexion DB en cours…</Text>
        </View>
        <View style={styles.panel}>
          <Text style={adminTypography.sectionTitle}>Alertes importantes</Text>
          <Text style={styles.placeholder}>Connexion DB en cours…</Text>
        </View>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: adminSpacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: adminSpacing.lg,
    flexWrap: 'wrap',
  },
  panel: {
    flex: 1,
    minWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    padding: adminSpacing.lg,
    minHeight: 240,
  },
  placeholder: {
    color: adminColors.textLight,
    fontSize: 13,
    marginTop: 16,
  },
});
