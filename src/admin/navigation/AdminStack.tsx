import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminPlaceholder from '../screens/AdminPlaceholderScreen';

const Stack = createNativeStackNavigator();

// Placeholders V1 — chaque route a déjà son entrée pour que le linking et la
// sidebar fonctionnent, le contenu vient en Phase 1.
const placeholders = [
  { name: 'AdminTeachers', title: 'Profs', icon: 'school-outline' as const, desc: 'Liste filtrable des profs avec fiches détaillées : CA, commission, note, statut, actions (valider, suspendre, contacter).' },
  { name: 'AdminStudents', title: 'Élèves', icon: 'people-outline' as const, desc: 'Liste filtrable des élèves : réservations, dépenses, points, catégories préférées, dernière connexion.' },
  { name: 'AdminClasses', title: 'Cours & Activités', icon: 'calendar-outline' as const, desc: 'Liste des cours et sessions avec statuts (brouillon, publié, complet, annulé). Filtres prof, catégorie, ville, date.' },
  { name: 'AdminBookings', title: 'Réservations', icon: 'bookmark-outline' as const, desc: 'Toutes les réservations de la plateforme : élève, prof, cours, montant, commission, statut, paiement.' },
  { name: 'AdminFinance', title: 'Finances', icon: 'trending-up-outline' as const, desc: 'CA encaissé, reversements profs, commission Koureo, frais Stripe, remboursements, résultat net.' },
  { name: 'AdminExpenses', title: 'Dépenses', icon: 'card-outline' as const, desc: 'Ajouter et catégoriser les dépenses (hébergement, publicité, dev…) avec justificatif et impact sur le résultat net.' },
  { name: 'AdminLoyalty', title: 'Fidélité & Points', icon: 'gift-outline' as const, desc: 'Points distribués, utilisés, expirés. Transactions par utilisateur, ajustement manuel, boutique récompenses.' },
];

export default function AdminStack() {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      {placeholders.map((p) => (
        <Stack.Screen key={p.name} name={p.name}>
          {() => (
            <AdminPlaceholder
              title={p.title}
              subtitle="Module en cours d'implémentation"
              icon={p.icon}
              description={p.desc}
            />
          )}
        </Stack.Screen>
      ))}
    </Stack.Navigator>
  );
}
