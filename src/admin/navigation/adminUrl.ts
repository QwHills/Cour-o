import { Platform } from 'react-native';

// Détecte si l'URL courante (browser) cible la branche admin. Renvoie false
// hors web — l'admin Koureo est web-only. Doit rester synchrone pour pouvoir
// être utilisé dans l'initial state du RootNavigator.
export function isOnAdminUrl(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/admin');
}

// Si on est sur /admin/login et que l'utilisateur vient de se connecter avec
// un rôle non-admin, on peut le rediriger vers son espace standard. Utilitaire
// pour plus tard (post-login redirect).
export function redirectToRoleHome(role: 'admin' | 'pro' | 'user'): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const target = role === 'admin' ? '/admin/dashboard' : role === 'pro' ? '/pro/dashboard' : '/';
  if (window.location.pathname !== target) {
    window.location.href = target;
  }
}
