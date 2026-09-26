import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space } from '../../theme';

type CardVariant = 'default' | 'hero' | 'subtle' | 'warning' | 'danger';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: 14 | 16 | 0;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  gap?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding,
  style,
  onPress,
  accessibilityLabel,
  gap = 12,
}) => {
  const pad = padding ?? (variant === 'hero' ? space.heroPad : space.cardPad);
  const cardStyle = [styles.base, styles[variant], { padding: pad, gap }, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    borderWidth: 1,
  },
  default: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.card,
  },
  hero: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.field,
  },
  subtle: {
    backgroundColor: colors.surface.subtle,
    borderColor: colors.border.divider,
  },
  warning: {
    backgroundColor: colors.warning.bg,
    borderColor: colors.warning.border,
  },
  danger: {
    backgroundColor: colors.danger.bg,
    borderColor: colors.danger.border,
  },
  pressed: {
    opacity: 0.85,
  },
});
