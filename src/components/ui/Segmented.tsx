import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'default' | 'small';
}

export function Segmented<T extends string>({ options, value, onChange, size = 'default' }: SegmentedProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.item, size === 'small' && styles.itemSmall, selected && styles.itemSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface.inset,
    borderRadius: radius.tile,
    padding: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.badge,
    minHeight: 34,
  },
  itemSmall: {
    paddingVertical: 5,
    minHeight: 28,
  },
  itemSelected: {
    backgroundColor: colors.action.fill,
  },
  label: {
    ...type.buttonSmall,
    color: colors.text.secondary,
  },
  labelSelected: {
    color: colors.action.onFill,
  },
});
