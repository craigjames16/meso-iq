import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { colors, glass, motion, radius, type Spring } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { GlassRim } from './GlassRim';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: 30 | 32 | 34;
  /** `glass` is for chrome that floats over scrolling content, like a pinned header. */
  variant?: 'raised' | 'plain' | 'round' | 'glass';
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
  const isGlass = variant === 'glass';
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  // iOS 26 grows and shimmers the material itself, so the spring is only for
  // the platforms that fall back to a plain translucent fill.
  const springs = isGlass && !isLiquidGlassSupported && !reducedMotion;

  // Feedback lands on the press itself, not on release.
  const press = useCallback(
    (to: number, config: Spring) => {
      Animated.spring(scale, { toValue: to, useNativeDriver: true, ...config }).start();
    },
    [scale],
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={springs ? () => press(0.9, motion.press) : undefined}
      onPressOut={springs ? () => press(1, motion.release) : undefined}
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
        isGlass && styles.glass,
        pressed && !springs && !isLiquidGlassSupported && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isGlass ? (
        <Animated.View style={[styles.surface, { borderRadius: size / 2, transform: [{ scale }] }]}>
          {isLiquidGlassSupported ? (
            <LiquidGlassView
              style={[styles.surface, { borderRadius: size / 2 }]}
              effect="regular"
              colorScheme="dark"
              interactive
            >
              {icon}
            </LiquidGlassView>
          ) : (
            <View style={[styles.surface, styles.surfaceFallback, { borderRadius: size / 2 }]}>{icon}</View>
          )}
          <GlassRim width={size} height={size} />
        </Animated.View>
      ) : (
        icon
      )}
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
  glass: {
    borderRadius: radius.round,
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  surfaceFallback: {
    backgroundColor: glass.fill,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
