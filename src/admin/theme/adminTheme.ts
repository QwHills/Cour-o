// Admin design tokens — adaptation desktop du DS Koureo
// On reprend la palette/typo du theme principal mais on densifie les espacements
// (interface back-office = haute densité d'info, fini les rondeurs lifestyle).
import { colors as baseColors, radii as baseRadii } from '../../theme/theme';

export const adminColors = {
  ...baseColors,
  // Surfaces back-office spécifiques
  pageBg: '#F7F8FA',          // gris très clair pour la zone de contenu
  sidebarBg: '#0F172A',       // navy foncé (sidebar)
  sidebarBgHover: '#1E293B',
  sidebarText: '#CBD5E1',
  sidebarTextActive: '#FFFFFF',
  sidebarAccent: baseColors.primary,
  tableHeader: '#F1F5F9',
  tableBorder: '#E5E7EB',
  tableRowHover: '#F8FAFC',
};

export const adminRadii = {
  ...baseRadii,
  card: 12,        // moins arrondi que le DS principal (24px)
  button: 8,
  pill: 999,
};

export const adminSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const adminShadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
};

export const adminTypography = {
  pageTitle: { fontSize: 22, fontWeight: '700' as const, color: baseColors.text, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 15, fontWeight: '700' as const, color: baseColors.text },
  cardTitle: { fontSize: 13, fontWeight: '600' as const, color: baseColors.textSecondary, letterSpacing: 0.2 },
  metric: { fontSize: 26, fontWeight: '700' as const, color: baseColors.text, letterSpacing: -0.5 },
  body: { fontSize: 14, fontWeight: '400' as const, color: baseColors.text },
  small: { fontSize: 12, fontWeight: '500' as const, color: baseColors.textSecondary },
  tableHeader: { fontSize: 11, fontWeight: '600' as const, color: baseColors.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' as const },
};
