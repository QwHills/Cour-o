// Linking config React Navigation pour activer les URLs /admin/*
// (Expo Web). Combiné au NavigationContainer dans RootNavigator.
//
// Le NavigationContainer racine accepte une seule config `linking` qui décrit
// TOUTES les routes accessibles via URL. Ici on déclare uniquement la branche
// admin — les autres écrans (UserTabs, ProTabs, Auth) restent navigation-only
// sans URL dédiée (comme aujourd'hui).
import { LinkingOptions } from '@react-navigation/native';

export const adminLinking: LinkingOptions<any> = {
  prefixes: ['/', 'koureo://'],
  config: {
    screens: {
      // Les écrans non-admin n'ont pas de path → ne sont pas exposés via URL.
      // Si l'utilisateur tape "/" il atterrit sur l'écran initial selon son rôle.
      AdminDashboard: 'admin/dashboard',
      AdminTeachers: 'admin/profs',
      AdminStudents: 'admin/eleves',
      AdminClasses: 'admin/cours',
      AdminBookings: 'admin/reservations',
      AdminFinance: 'admin/finances',
      AdminExpenses: 'admin/depenses',
      AdminLoyalty: 'admin/fidelite',
      AdminSupport: 'admin/support',
      AdminAcquisition: 'admin/acquisition',
      AdminSettings: 'admin/parametres',
    },
  },
};
