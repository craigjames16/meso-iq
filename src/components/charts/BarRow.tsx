import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, tabularNums, type } from '../../theme';

interface BarRowProps {
  label: string;
  value: number;
  max: number;
  /** Lower bound; below zero draws a diverging bar around a zero line. */
  min?: number;
  /** A 2px reference mark, for example the 4-week average. */
  tick?: number | null;
  color?: string;
  /** Text on the right. Defaults to the value. */
  valueLabel?: string;
  valueColor?: string;
  /** Short delta text after the value, for example "+2". */
  delta?: { label: string; color: string } | null;
  labelWidth?: number;
  height?: 12 | 14;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const BarRow: React.FC<BarRowProps> = ({
  label,
  value,
  max,
  min = 0,
  tick,
  color = colors.data.main,
  valueLabel,
  valueColor = colors.text.primary,
  delta,
  labelWidth = 64,
  height = 14,
  onPress,
  accessibilityLabel,
}) => {
  const span = Math.max(max - min, 1e-9);
  const clamp = (n: number) => Math.min(Math.max(n, 0), 1);
  const pct = (fraction: number): `${number}%` => `${Number((clamp(fraction) * 100).toFixed(2))}%`;
  const zero = min < 0 ? (0 - min) / span : 0;
  const fillStart = min < 0 ? Math.min(zero, (value - min) / span) : 0;
  const fillEnd = min < 0 ? Math.max(zero, (value - min) / span) : (value - min) / span;

  const row = (
    <View style={styles.row}>
      <Text style={[styles.label, { width: labelWidth }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.track, { height }, min < 0 && styles.trackClear]}>
        {min < 0 ? <View style={[styles.zero, { left: pct(zero) }]} /> : null}
        <View
          style={[
            styles.fill,
            {
              height,
              backgroundColor: color,
              left: pct(fillStart),
              width: pct(fillEnd - fillStart),
            },
          ]}
        />
        {tick != null && Number.isFinite(tick) ? (
          <View style={[styles.tick, { height: height + 6, left: pct((tick - min) / span) }]} />
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={[styles.value, { color: valueColor }]}>{valueLabel ?? String(value)}</Text>
        {delta ? <Text style={[styles.delta, { color: delta.color }]}>{delta.label}</Text> : null}
      </View>
    </View>
  );

  if (!onPress) return row;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${valueLabel ?? value}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {row}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 22,
  },
  label: {
    ...type.metaSmall,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.text.secondary,
  },
  track: {
    flex: 1,
    backgroundColor: colors.border.track,
    borderRadius: radius.bar,
    justifyContent: 'center',
  },
  trackClear: {
    backgroundColor: 'transparent',
  },
  fill: {
    position: 'absolute',
    top: 0,
    borderRadius: radius.bar,
  },
  zero: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: 1,
    backgroundColor: colors.border.strong,
  },
  tick: {
    position: 'absolute',
    width: 2,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: colors.data.reference,
  },
  right: {
    minWidth: 56,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 5,
  },
  value: {
    ...type.value,
    fontSize: 14,
    ...tabularNums,
  },
  delta: {
    ...type.caption,
    fontSize: 11,
    fontWeight: '600',
    ...tabularNums,
  },
  pressed: {
    opacity: 0.7,
  },
});
