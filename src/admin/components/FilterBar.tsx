import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { adminColors, adminRadii, adminSpacing } from '../theme/adminTheme';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[]; // first option = "all" / aucun filtre
}

interface FilterBarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  filters?: FilterDef[];
  values?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export default function FilterBar({
  search,
  filters = [],
  values = {},
  onFilterChange,
  rightAction,
  style,
}: FilterBarProps) {
  return (
    <View style={[styles.bar, style]}>
      {search ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={adminColors.textLight} />
          <TextInput
            value={search.value}
            onChangeText={search.onChange}
            placeholder={search.placeholder ?? 'Rechercher…'}
            placeholderTextColor={adminColors.textLight}
            style={styles.searchInput}
          />
        </View>
      ) : null}

      <View style={styles.filtersRow}>
        {filters.map((f) => (
          <FilterPill
            key={f.key}
            def={f}
            value={values[f.key] ?? f.options[0]?.value}
            onChange={(v) => onFilterChange?.(f.key, v)}
          />
        ))}
      </View>

      <View style={{ flex: 1 }} />
      {rightAction}
    </View>
  );
}

function FilterPill({
  def,
  value,
  onChange,
}: {
  def: FilterDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = def.options.find((o) => o.value === value) ?? def.options[0];
  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity style={styles.pill} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        <Text style={styles.pillText}>{def.label}: {selected?.label ?? '—'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={adminColors.textSecondary} />
      </TouchableOpacity>
      {open ? (
        <View style={styles.dropdown}>
          {def.options.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[styles.dropdownItem, o.value === value ? styles.dropdownItemActive : null]}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  o.value === value ? styles.dropdownItemTextActive : null,
                ]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: adminSpacing.md,
    paddingHorizontal: adminSpacing.lg,
    paddingVertical: adminSpacing.md,
    backgroundColor: adminColors.card,
    borderRadius: adminRadii.card,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    marginBottom: adminSpacing.lg,
    flexWrap: 'wrap',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: adminSpacing.sm,
    paddingHorizontal: adminSpacing.md,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: adminRadii.button,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    minWidth: 240,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: adminColors.text,
    outlineWidth: 0,
  } as any,
  filtersRow: {
    flexDirection: 'row',
    gap: adminSpacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: adminSpacing.md,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: adminRadii.pill,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.textSecondary,
  },
  dropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    borderRadius: adminRadii.button,
    paddingVertical: 4,
    zIndex: 100,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: adminSpacing.md,
    paddingVertical: 8,
  },
  dropdownItemActive: {
    backgroundColor: '#ecfbf7',
  },
  dropdownItemText: {
    fontSize: 13,
    color: adminColors.text,
  },
  dropdownItemTextActive: {
    color: adminColors.primary,
    fontWeight: '600',
  },
});
