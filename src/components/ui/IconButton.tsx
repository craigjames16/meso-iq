import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: 30 | 32 | 34;
  variant?: 'raised' | 'plain' | 'round';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  size = 32,
  variant = 'raised',
  disabled,
  style,
}) => {
  // Keep the hit area at 44pt even when the visual is smaller.
  const slop = Math.max(0, Math.ceil((44 - size) / 2));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size },
        variant === 'raised' && styles.raised,
        variant === 'round' && styles.round,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
  },
  raised: {
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.raised,
  },
  round: {
    borderRadius: radius.round,
    backgroundColor: colors.surface.field,
    borderWidth: 1,
    borderColor: colors.border.field,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
