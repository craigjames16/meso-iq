import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, tabularNums, type, size } from '../../theme';
import { FLAT_DELTA, formatPercentDelta } from '../../utils/format';

interface DeltaTextProps {
  /** Fractional change: 0.031 renders "+3.1%". */
  value: number | null | undefined;
  digits?: number;
  style?: StyleProp<TextStyle>;
  /** Force the negative colour, for example on a stalled lift. */
  tone?: 'auto' | 'danger' | 'muted';
  suffix?: string;
}

export function deltaColor(value: number): string {
  if (Math.abs(value) < FLAT_DELTA) return colors.text.muted;
  return value > 0 ? colors.success.pillText : colors.danger.base;
}

export const DeltaText: React.FC<DeltaTextProps> = ({ value, digits = 1, style, tone = 'auto', suffix }) => {
  if (value == null || !Number.isFinite(value)) return null;
  const color =
    tone === 'danger' ? colors.danger.base : tone === 'muted' ? colors.text.muted : deltaColor(value);
  return (
    <Text style={[styles.text, { color }, style]}>
      {formatPercentDelta(value, digits)}
      {suffix ? ` ${suffix}` : ''}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    ...type.metaSmall,
    fontSize: size.metaMid,
    fontWeight: '600',
    ...tabularNums,
  },
});
