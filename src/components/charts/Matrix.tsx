import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, tabularNums, type } from '../../theme';

interface MatrixProps {
  rows: string[];
  cols: string[];
  /** Levels 0–4 per cell. */
  cells: number[][];
  counts?: number[][];
}

export const Matrix: React.FC<MatrixProps> = ({ rows, cols, cells, counts }) => (
  <View style={styles.wrap} accessibilityRole="image">
    {rows.map((row, ri) => (
      <View key={row} style={styles.row}>
        <Text style={styles.rowLabel}>{row}</Text>
        {cols.map((col, ci) => {
          const level = Math.max(0, Math.min(4, cells[ri]?.[ci] ?? 0));
          const count = counts?.[ri]?.[ci] ?? 0;
          return (
            <View
              key={col}
              style={[styles.cell, { backgroundColor: colors.data.matrix[level] }]}
              accessibilityLabel={`${row} for ${col} reps: ${count} sets`}
            >
              {count > 0 ? (
                <Text style={[styles.count, level === 4 ? styles.countMax : null]}>{count}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    ))}
    <View style={styles.row}>
      <View style={styles.rowLabelSpace} />
      {cols.map((col) => (
        <Text key={col} style={styles.colLabel}>
          {col}
        </Text>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowLabel: {
    width: 38,
    textAlign: 'right',
    ...type.caption,
    color: colors.text.muted,
    ...tabularNums,
  },
  rowLabelSpace: {
    width: 38,
  },
  cell: {
    flex: 1,
    minHeight: 26,
    borderRadius: radius.bar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    ...type.tag,
    fontWeight: '600',
    color: colors.text.body,
    ...tabularNums,
  },
  countMax: {
    color: colors.data.onMatrixMax,
  },
  colLabel: {
    flex: 1,
    textAlign: 'center',
    ...type.caption,
    color: colors.text.muted,
    paddingTop: 2,
  },
});
