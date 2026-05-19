import { Category } from '../types/domain';

// Use Ionicons (vector, monochrome) — avoids iOS emoji-coloring of unicode glyphs
// like ☯ or ❀ which get auto-rendered as colored emoji on iPhone.
type IoniconName =
  | 'leaf-outline'
  | 'musical-notes-outline'
  | 'musical-note-outline'
  | 'barbell-outline'
  | 'flower-outline'
  | 'language-outline'
  | 'color-palette-outline'
  | 'restaurant-outline'
  | 'sparkles-outline'
  | 'happy-outline'
  | 'briefcase-outline'
  | 'ellipse-outline';

const CATEGORY_ICONS: Record<Category, { iconName: IoniconName; symbol: string; color: string }> = {
  Yoga:                       { iconName: 'leaf-outline',         symbol: 'Y',  color: '#A4B5A0' },
  Danse:                      { iconName: 'musical-notes-outline',symbol: 'D',  color: '#43c4b0' },
  Musique:                    { iconName: 'musical-note-outline', symbol: 'M',  color: '#2faf9b' },
  Sport:                      { iconName: 'barbell-outline',      symbol: 'S',  color: '#7EB5A6' },
  'Bien-être':                { iconName: 'flower-outline',       symbol: 'B',  color: '#D9B5C0' },
  Langues:                    { iconName: 'language-outline',     symbol: 'L',  color: '#8B7EC8' },
  Créatif:                    { iconName: 'color-palette-outline',symbol: 'C',  color: '#C9A96E' },
  Cuisine:                    { iconName: 'restaurant-outline',   symbol: 'K',  color: '#B08D6A' },
  'Développement personnel':  { iconName: 'sparkles-outline',     symbol: 'P',  color: '#7E9BC8' },
  Enfants:                    { iconName: 'happy-outline',        symbol: 'E',  color: '#F2B6C0' },
  Business:                   { iconName: 'briefcase-outline',    symbol: 'B',  color: '#5A6B7C' },
};

export function getCategoryIcon(category: string): string {
  // Letter fallback (used by legacy callers that render a Text node).
  return CATEGORY_ICONS[category as Category]?.symbol ?? '•';
}

export function getCategoryIconName(category: string): IoniconName {
  return CATEGORY_ICONS[category as Category]?.iconName ?? 'ellipse-outline';
}

export function getCategoryColor(category: string): string {
  return CATEGORY_ICONS[category as Category]?.color ?? '#43c4b0';
}
