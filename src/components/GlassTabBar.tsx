import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, glass, motion, radius, shadow, type, type Spring } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { DataTabGlyph, PlanTabGlyph, TrackTabGlyph } from './ui/glyphs';

const BAR_GUTTER = 10;
const BAR_BOTTOM = 14;
const RAIL_PAD = 6; // between the bar's edge and an item, keeps the two radii concentric
const ITEM_HEIGHT = 46;
const BAR_HEIGHT = ITEM_HEIGHT + RAIL_PAD * 2; // 58, so radius.tabBar (29) closes the capsule
const GLYPH = 21;

const TAB_GLYPHS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  Track: TrackTabGlyph,
  Data: DataTabGlyph,
  Plan: PlanTabGlyph,
};

/** Space a scrolling tab screen needs under its content to clear the bar. */
export const TAB_BAR_CLEARANCE = 92;

/**
 * The 1px gradient edge that makes the bar read as a pane of glass rather than
 * a flat panel. It is brightest at the top, where light would strike it.
 */
const GlassRim: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  if (width === 0) {
    return null;
  }
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id="tabRim" x1="0" y1="0" x2="0.4" y2="1">
          {glass.rimStops.map(stop => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={(height - 1) / 2}
        fill="none"
        stroke="url(#tabRim)"
        strokeWidth={1}
      />
    </Svg>
  );
};

interface TabItemProps {
  label: string;
  Glyph: React.FC<{ size?: number; color?: string }>;
  /** Fades in as the selection capsule arrives, so the tab brightens under it. */
  active: Animated.AnimatedInterpolation<number>;
  idle: Animated.AnimatedInterpolation<number>;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({
  label,
  Glyph,
  active,
  idle,
  accessibilityLabel,
  selected,
  onPress,
  onLongPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  // Feedback lands on the press itself, not on release.
  const press = useCallback(
    (to: number, config: Spring) => {
      Animated.spring(scale, { toValue: to, useNativeDriver: true, ...config }).start();
    },
    [scale],
  );

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => press(0.9, motion.press)}
      onPressOut={() => press(1, motion.release)}
      style={styles.item}
    >
      <Animated.View style={[styles.itemInner, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.layer, { opacity: idle }]}>
          <Glyph size={GLYPH} color={colors.text.secondary} />
          <Text style={[styles.label, styles.labelIdle]}>{label}</Text>
        </Animated.View>
        <Animated.View
          style={[styles.layer, styles.layerOver, { opacity: active }]}
          importantForAccessibility="no-hide-descendants"
        >
          <Glyph size={GLYPH} color={colors.text.primary} />
          <Text style={[styles.label, styles.labelActive]}>{label}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export const GlassTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);

  // One value drives the whole selection: the capsule's travel and every tab's
  // brightness. Because they read the same value they can never drift apart.
  const position = useRef(new Animated.Value(state.index)).current;
  const count = state.routes.length;
  const itemWidth = count > 0 ? barWidth / count : 0;

  useEffect(() => {
    if (reducedMotion) {
      position.setValue(state.index);
      return;
    }
    // A spring re-targets from wherever the capsule currently is, so tapping
    // mid-slide redirects it instead of restarting the travel.
    const anim = Animated.spring(position, {
      toValue: state.index,
      useNativeDriver: true,
      ...motion.tabSelect,
    });
    anim.start();
    return () => anim.stop();
  }, [position, reducedMotion, state.index]);

  const onRailLayout = useCallback((event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  }, []);

  const items = (
    <View style={styles.rail} onLayout={onRailLayout}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.capsule,
          { width: itemWidth, transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, itemWidth] }) }] },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            label={label}
            Glyph={TAB_GLYPHS[route.name] ?? TrackTabGlyph}
            active={position.interpolate({
              inputRange: [index - 1, index, index + 1],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            })}
            idle={position.interpolate({
              inputRange: [index - 1, index, index + 1],
              outputRange: [1, 0, 1],
              extrapolate: 'clamp',
            })}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            selected={isFocused}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );

  return (
    <View style={[styles.outer, { bottom: BAR_BOTTOM + insets.bottom }]} pointerEvents="box-none">
      {isLiquidGlassSupported ? (
        <LiquidGlassView style={styles.inner} effect="regular" colorScheme="dark">
          {items}
        </LiquidGlassView>
      ) : (
        <View style={[styles.inner, styles.innerFallback]}>{items}</View>
      )}
      <GlassRim width={barWidth + RAIL_PAD * 2} height={BAR_HEIGHT} />
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: BAR_GUTTER,
    right: BAR_GUTTER,
    height: BAR_HEIGHT,
    borderRadius: radius.tabBar,
    zIndex: 99,
    ...shadow.tabBar,
  },
  inner: {
    flex: 1,
    borderRadius: radius.tabBar,
    overflow: 'hidden',
  },
  innerFallback: {
    backgroundColor: glass.fill,
  },
  rail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    margin: RAIL_PAD,
  },
  capsule: {
    position: 'absolute',
    left: 0,
    height: ITEM_HEIGHT,
    borderRadius: radius.tabItem,
    backgroundColor: glass.selectedFill,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: glass.selectedEdge,
  },
  item: {
    flex: 1,
    height: ITEM_HEIGHT,
  },
  itemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  layerOver: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    ...type.tabLabel,
    lineHeight: 13,
  },
  labelIdle: {
    color: colors.text.secondary,
  },
  labelActive: {
    color: colors.text.primary,
  },
});
