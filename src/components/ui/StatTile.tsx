import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, tabularNums, type } from '../../theme';
import { DeltaText } from './DeltaText';

interface StatTileProps {
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  unit?: string;
  meta?: string;
  /** Shown in place of the value when the metric needs more history. */
  empty?: boolean;
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, delta, deltaSuffix, unit, meta, empty }) => (
  <View style={styles.tile}>
    <Text style={styles.label} numberOfLines={1}>
      {label}
    </Text>
    {empty ? (
      <Text style={styles.empty}>Not enough sessions yet</Text>
    ) : (
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    )}
    {delta != null && !empty ? <DeltaText value={delta} suffix={deltaSuffix} /> : null}
    {meta ? (
      <Text style={styles.meta} numberOfLines={1}>
        {meta}
      </Text>
    ) : null}
  </View>
);

/** Two or more tiles in a row. */
export const StatRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.row}>{children}</View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface.inset,
    borderRadius: radius.tile,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 3,
  },
  label: {
    ...type.caption,
    color: colors.text.muted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    ...type.stat,
    color: colors.text.primary,
    flexShrink: 1,
  },
  unit: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  meta: {
    ...type.caption,
    color: colors.text.faint,
    ...tabularNums,
  },
  empty: {
    ...type.metaSmall,
    color: colors.text.muted,
    paddingVertical: 4,
  },
});
