import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, tabularNums, type } from '../../theme';
import { DeltaText } from './DeltaText';
import { NOT_ENOUGH_COPY } from './States';

interface StatTileProps {
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  unit?: string;
  /** A third line, for example a record's date. */
  meta?: string;
  valueColor?: string;
  /** Label above the value, as on the records grid. Defaults to below. */
  labelFirst?: boolean;
  /** Shows "Not enough sessions yet" in place of the value. */
  empty?: boolean;
  emptyLabel?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  delta,
  deltaSuffix,
  unit,
  meta,
  valueColor,
  labelFirst,
  empty,
  emptyLabel = NOT_ENOUGH_COPY,
}) => {
  const labelNode = (
    <Text style={styles.label} numberOfLines={1}>
      {label}
    </Text>
  );
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${empty ? emptyLabel : `${value}${unit ? ` ${unit}` : ''}`}`}>
      {labelFirst ? labelNode : null}
      {empty ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        <View style={styles.valueRow}>
          <Text style={[styles.value, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {value}
          </Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
      )}
      {!labelFirst ? labelNode : null}
      {delta != null && !empty ? <DeltaText value={delta} suffix={deltaSuffix} /> : null}
      {meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
};

/** Tiles in a row that share the width. */
export const StatRow: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.row}>{children}</View>;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderColor: colors.border.card,
    borderWidth: 1,
    borderRadius: radius.tile,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 3,
  },
  label: {
    ...type.metaSmall,
    fontSize: 11,
    color: colors.text.muted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    ...type.stat,
    fontSize: 19,
    fontWeight: '600',
    color: colors.text.primary,
    flexShrink: 1,
  },
  unit: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  meta: {
    ...type.caption,
    fontSize: 11,
    color: colors.text.faint,
    ...tabularNums,
  },
  empty: {
    ...type.metaSmall,
    color: colors.text.muted,
    paddingVertical: 3,
  },
});
