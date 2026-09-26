import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, tabularNums, type } from '../../theme';
import { IconButton } from './IconButton';
import { PlusGlyph } from './glyphs';
import Svg, { Path } from 'react-native-svg';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  format?: (value: number) => string;
}

const MinusGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
    <Path d="M3.2 8h9.6" stroke={colors.text.body} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const Stepper: React.FC<StepperProps> = ({ value, min, max, onChange, label, format }) => (
  <View style={styles.row} accessibilityLabel={`${label}: ${value}`}>
    <IconButton
      icon={<MinusGlyph />}
      onPress={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      accessibilityLabel={`Decrease ${label}`}
      size={34}
    />
    <Text style={styles.value}>{format ? format(value) : value}</Text>
    <IconButton
      icon={<PlusGlyph color={colors.text.body} />}
      onPress={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      accessibilityLabel={`Increase ${label}`}
      size={34}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.inset,
    borderRadius: radius.tile,
    padding: 3,
  },
  value: {
    ...type.setField,
    ...tabularNums,
    minWidth: 44,
    textAlign: 'center',
    color: colors.text.primary,
  },
});
