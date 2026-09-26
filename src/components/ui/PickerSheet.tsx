import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';
import { Sheet } from './Sheet';
import { CheckGlyph } from './glyphs';

interface PickerSheetProps<T extends string | number> {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: { value: T; label: string; meta?: string }[];
  value: T | null;
  onChange: (value: T) => void;
}

/** A single-choice list in a sheet, for filter chips. */
export function PickerSheet<T extends string | number>({ visible, onClose, title, subtitle, options, value, onChange }: PickerSheetProps<T>) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View>
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => {
                onChange(o.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.row, i > 0 && styles.divider]}
            >
              <View style={styles.text}>
                <Text style={[styles.label, selected && styles.labelSelected]}>{o.label}</Text>
                {o.meta ? <Text style={styles.meta}>{o.meta}</Text> : null}
              </View>
              {selected ? <CheckGlyph color={colors.action.fill} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    minHeight: 44,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...type.body,
    color: colors.text.body,
  },
  labelSelected: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  meta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
});
