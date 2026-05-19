// Koureo Design System — Premium lifestyle aesthetic
// Direction: Airbnb clarity × ClassPass lifestyle × Calm softness × Apple minimalism

export const colors = {
  // Brand — teal/menthe (aligné vitrine)
  primary: '#43c4b0',       // teal
  primaryLight: '#56d6c1',
  primaryDark: '#2faf9b',
  gradientStart: '#56d6c1',
  gradientEnd: '#43c4b0',

  // Accents
  secondary: '#7EB5A6',     // sauge/jade
  accent: '#C9A96E',        // doré doux
  accentLight: '#E8DCC8',
  proAccent: '#8B7EC8',     // lavande
  proGradientStart: '#8B7EC8',
  proGradientEnd: '#A99BDB',

  // Surfaces — crème ivoire
  background: '#f8fbfa',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surface: '#ecfbf7',       // brand-50
  surfaceWarm: '#F5F0E8',

  // Text — brun/taupe (jamais noir pur)
  text: '#1A1714',
  textSecondary: '#8C8580',  // taupe
  textLight: '#B5AFA8',      // sable foncé
  textInverse: '#FFFFFF',

  // Borders — crème
  border: '#EDE8E0',
  borderLight: '#F5F0E8',

  // Status — tons naturels
  success: '#6AAB8E',       // vert sauge
  successLight: '#EEF6F1',
  warning: '#D4A84B',       // ambre
  warningLight: '#FDF6E8',
  error: '#C75F4A',         // terracotta foncé
  errorLight: '#FBEFEC',
  info: '#7EB5A6',
  infoLight: '#EEF5F2',

  // Overlays
  overlay: 'rgba(26,23,20,0.35)',
  overlayLight: 'rgba(26,23,20,0.15)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
};

export const borderRadius = radii;

export const shadows = {
  sm: {
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  button: {
    shadowColor: '#43c4b0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  buttonPro: {
    shadowColor: '#8B7EC8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  sheet: {
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const typography = {
  // Brand mark
  brand: { fontSize: 13, fontWeight: '500' as const, color: colors.text, letterSpacing: 6, textTransform: 'uppercase' as const },
  // Headings — elegant, not heavy
  display: { fontSize: 32, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: 21, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
  h4: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  // Body
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text, lineHeight: 24 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary, lineHeight: 20 },
  // Captions — refined
  caption: { fontSize: 11, fontWeight: '500' as const, color: colors.textLight, letterSpacing: 1 },
  captionBold: { fontSize: 11, fontWeight: '600' as const, color: colors.textSecondary, letterSpacing: 0.8 },
  // Button
  button: { fontSize: 15, fontWeight: '600' as const, color: colors.textInverse, letterSpacing: 0.3 },
};

export const theme = {
  colors,
  spacing,
  radii,
  shadows,
  typography,
};

export type Theme = typeof theme;
