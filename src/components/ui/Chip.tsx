import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';
import { ChevronGlyph } from './glyphs';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Shows a chevron, for filter chips that open a picker. */
  dropdown?: boolean;
  accessibilityLabel?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, selected = false, onPress, dropdown, accessibilityLabel }) => {
  const content = (
    <View style={styles.inner}>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {dropdown ? (
        <ChevronGlyph
          direction="down"
          size={11}
          color={selected ? colors.action.onFill : colors.text.secondary}
          strokeWidth={2}
        />
      ) : null}
    </View>
  );
  if (!onPress) {
    return <View style={[styles.base, selected ? styles.selected : styles.unselected]}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [styles.base, selected ? styles.selected : styles.unselected, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.field,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  unselected: {
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.raised,
  },
  selected: {
    backgroundColor: colors.action.fill,
    borderColor: colors.action.fill,
  },
  label: {
    ...type.metaSmall,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  labelSelected: {
    color: colors.action.onFill,
  },
  pressed: {
    opacity: 0.8,
  },
});
