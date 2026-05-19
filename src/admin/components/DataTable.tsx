import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ViewStyle } from 'react-native';
import { adminColors, adminRadii, adminSpacing, adminShadows, adminTypography } from '../theme/adminTheme';

export interface Column<T> {
  key: string;
  label: string;
  width?: number;       // largeur fixe en px (sinon flex 1)
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowPress?: (row: T) => void;
  emptyMessage?: string;
  style?: ViewStyle;
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowPress,
  emptyMessage = 'Aucun résultat',
  style,
  pagination,
}: DataTableProps<T>) {
  const totalWidth = columns.reduce((acc, c) => acc + (c.width ?? 0), 0);

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: Math.max(totalWidth, 800) }}>
          {/* Header */}
          <View style={styles.headerRow}>
            {columns.map((c) => (
              <View
                key={c.key}
                style={[
                  styles.cell,
                  c.width ? { width: c.width } : { flex: 1 },
                  { justifyContent: alignToFlex(c.align) },
                ]}
              >
                <Text style={adminTypography.tableHeader}>{c.label}</Text>
              </View>
            ))}
          </View>

          {/* Body */}
          {data.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            data.map((row, i) => {
              const content = (
                <View style={[styles.bodyRow, i === data.length - 1 ? styles.lastRow : null]}>
                  {columns.map((c) => (
                    <View
                      key={c.key}
                      style={[
                        styles.cell,
                        c.width ? { width: c.width } : { flex: 1 },
                        { justifyContent: alignToFlex(c.align) },
                      ]}
                    >
                      {c.render(row, i)}
                    </View>
                  ))}
                </View>
              );

              if (onRowPress) {
                return (
                  <TouchableOpacity
                    key={rowKey(row)}
                    onPress={() => onRowPress(row)}
                    activeOpacity={0.6}
                  >
                    {content}
                  </TouchableOpacity>
                );
              }
              return <View key={rowKey(row)}>{content}</View>;
            })
          )}
        </View>
      </ScrollView>

      {pagination ? <Pagination {...pagination} /> : null}
    </View>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <View style={styles.paginationRow}>
      <Text style={styles.paginationText}>{from}-{to} sur {total}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
          const p = i + 1;
          const active = p === page;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => onPageChange(p)}
              style={[styles.pageBtn, active ? styles.pageBtnActive : null]}
            >
              <Text style={[styles.pageBtnText, active ? styles.pageBtnTextActive : null]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function alignToFlex(a?: 'left' | 'right' | 'center'): ViewStyle['justifyContent'] {
  if (a === 'right') return 'flex-end';
  if (a === 'center') return 'center';
  return 'flex-start';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: adminColors.card,
    borderRadius: adminRadii.card,
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    overflow: 'hidden',
    ...adminShadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: adminColors.tableHeader,
    paddingHorizontal: adminSpacing.lg,
    paddingVertical: adminSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.tableBorder,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: adminSpacing.lg,
    paddingVertical: adminSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.tableBorder,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: adminSpacing.md,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: adminColors.textLight,
    fontSize: 13,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: adminSpacing.lg,
    paddingVertical: adminSpacing.md,
    borderTopWidth: 1,
    borderTopColor: adminColors.tableBorder,
    backgroundColor: '#FAFBFC',
  },
  paginationText: {
    fontSize: 12,
    color: adminColors.textSecondary,
  },
  pageBtn: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: adminColors.tableBorder,
    backgroundColor: '#FFFFFF',
  },
  pageBtnActive: {
    backgroundColor: adminColors.primary,
    borderColor: adminColors.primary,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.textSecondary,
  },
  pageBtnTextActive: {
    color: '#FFFFFF',
  },
});
