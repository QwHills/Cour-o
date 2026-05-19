// Single source of truth pour la navigation admin (sidebar + linking + types).
// Chaque entrée : route React Navigation, path URL relatif à /admin, label,
// icône Ionicons, et un flag `enabled` (false ⇒ visible mais désactivé en V1).
import type Ionicons from '@expo/vector-icons/Ionicons';

export type AdminRoute =
  | 'AdminDashboard'
  | 'AdminTeachers'
  | 'AdminStudents'
  | 'AdminClasses'
  | 'AdminBookings'
  | 'AdminFinance'
  | 'AdminLoyalty'
  | 'AdminExpenses'
  | 'AdminSupport'
  | 'AdminAcquisition'
  | 'AdminSettings';

export interface AdminMenuItem {
  route: AdminRoute;
  path: string; // sans le préfixe /admin
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean; // V1 true ; V2 false
  group: 'main' | 'finance' | 'quality' | 'system';
}

export const ADMIN_MENU: AdminMenuItem[] = [
  // ── Pilotage ──
  { route: 'AdminDashboard', path: 'dashboard', label: 'Dashboard', icon: 'speedometer-outline', enabled: true, group: 'main' },
  { route: 'AdminTeachers', path: 'profs', label: 'Profs', icon: 'school-outline', enabled: true, group: 'main' },
  { route: 'AdminStudents', path: 'eleves', label: 'Élèves', icon: 'people-outline', enabled: true, group: 'main' },
  { route: 'AdminClasses', path: 'cours', label: 'Cours & Activités', icon: 'calendar-outline', enabled: true, group: 'main' },
  { route: 'AdminBookings', path: 'reservations', label: 'Réservations', icon: 'bookmark-outline', enabled: true, group: 'main' },
  // ── Finance ──
  { route: 'AdminFinance', path: 'finances', label: 'Finances', icon: 'trending-up-outline', enabled: true, group: 'finance' },
  { route: 'AdminExpenses', path: 'depenses', label: 'Dépenses', icon: 'card-outline', enabled: true, group: 'finance' },
  { route: 'AdminLoyalty', path: 'fidelite', label: 'Fidélité & Points', icon: 'gift-outline', enabled: true, group: 'finance' },
  // ── Qualité (V2) ──
  { route: 'AdminSupport', path: 'support', label: 'Support & Qualité', icon: 'shield-checkmark-outline', enabled: false, group: 'quality' },
  { route: 'AdminAcquisition', path: 'acquisition', label: 'Acquisition', icon: 'rocket-outline', enabled: false, group: 'quality' },
  // ── Système ──
  { route: 'AdminSettings', path: 'parametres', label: 'Paramètres', icon: 'settings-outline', enabled: false, group: 'system' },
];

export const ADMIN_GROUP_LABELS: Record<AdminMenuItem['group'], string> = {
  main: 'Pilotage',
  finance: 'Finance',
  quality: 'Qualité',
  system: 'Système',
};
