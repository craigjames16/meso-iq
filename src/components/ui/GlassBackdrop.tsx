import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { colors, glass } from '../../theme';
import { useReducedTransparency } from '../../hooks/useReducedTransparency';

interface GlassBackdropProps {
  /**
   * How present the material is. At rest there is nothing behind the chrome to
   * refract, so it sits flush with the page and lifts as content arrives.
   */
  opacity?: Animated.AnimatedInterpolation<number> | number;
}

/**
 * The material behind chrome that floats over scrolling content. It fills its
 * parent and passes touches through, so a drag over empty header space still
 * scrolls the content underneath.
 */
export const GlassBackdrop: React.FC<GlassBackdropProps> = ({ opacity = 1 }) => {
  const solid = useReducedTransparency();

  if (solid) {
    return <View style={[StyleSheet.absoluteFill, styles.solid]} pointerEvents="none" />;
  }

  // The page colour masks the material and thins out as content arrives. The
  // glass itself never carries an animated opacity: that puts it in its own
  // compositing layer and detaches it from the content it samples, leaving a
  // pane that blurs nothing.
  const mask = typeof opacity === 'number' ? 1 - opacity : Animated.subtract(1, opacity);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {isLiquidGlassSupported ? (
        <LiquidGlassView style={StyleSheet.absoluteFill} effect="regular" colorScheme="dark" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}
      <Animated.View style={[StyleSheet.absoluteFill, styles.solid, { opacity: mask }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  solid: {
    backgroundColor: colors.bg,
  },
  fallback: {
    backgroundColor: glass.chromeFill,
  },
});
