import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, type } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dashed';

interface ButtonProps {
  variant?: ButtonVariant;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  size?: 'default' | 'small';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  label,
  onPress,
  disabled,
  loading,
  full,
  size = 'default',
  icon,
  style,
  accessibilityHint,
}) => {
  const inactive = disabled || loading;
  const textColor = {
    primary: colors.action.onFill,
    secondary: colors.text.body,
    ghost: colors.text.secondary,
    danger: colors.danger.base,
    dashed: colors.text.secondary,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.default,
        styles[variant],
        full && styles.full,
        variant === 'primary' && !inactive && shadow.primary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text
            style={[size === 'small' ? type.buttonSmall : type.button, { color: textColor }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  default: {
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  small: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.field,
    minHeight: 40,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: colors.action.fill,
  },
  secondary: {
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.raised,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: 'transparent',
  },
  dashed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.stronger,
  },
  full: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.4,
  },
});
