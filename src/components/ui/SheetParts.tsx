import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, type, size } from '../../theme';
import { CheckCircleGlyph } from './glyphs';

interface MenuActionProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  meta?: string;
}

/** A plain action row in a sheet, separated from its neighbours by dividers. */
export const MenuAction: React.FC<MenuActionProps> = ({ label, onPress, icon, destructive, disabled, meta }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
    style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}
  >
    {icon}
    <View style={styles.actionText}>
      <Text style={[styles.actionLabel, destructive && styles.destructive]}>{label}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  </Pressable>
);

export const MenuGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
};

interface OptionCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  left?: React.ReactNode;
  children?: React.ReactNode;
  selectedColors?: { bg: string; border: string; check: string };
}

/** A selectable card, for set types and off-plan sources. */
export const OptionCard: React.FC<OptionCardProps> = ({
  title,
  description,
  selected,
  onPress,
  left,
  children,
  selectedColors,
}) => {
  const sel = selectedColors ?? { bg: colors.surface.inset, border: colors.border.stronger, check: colors.action.fill };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.option,
        selected ? { backgroundColor: sel.bg, borderColor: sel.border } : styles.optionIdle,
      ]}
    >
      <View style={styles.optionRow}>
        {left}
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{title}</Text>
          {description ? <Text style={styles.meta}>{description}</Text> : null}
        </View>
        {selected ? <CheckCircleGlyph fill={sel.check} /> : <View style={styles.checkSpace} />}
      </View>
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 2,
    minHeight: 44,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    ...type.body,
    color: colors.text.body,
  },
  destructive: {
    fontWeight: '600',
    color: colors.danger.base,
  },
  meta: {
    ...type.metaSmall,
    fontSize: size.label,
    color: colors.text.muted,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.divider,
  },
  option: {
    borderRadius: radius.tile,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
  },
  optionIdle: {
    backgroundColor: colors.surface.subtle,
    borderColor: colors.border.card,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...type.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  checkSpace: {
    width: 20,
  },
});
