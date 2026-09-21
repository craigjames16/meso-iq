import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, glass, radius, shadow, type } from '../theme';
import { DataTabGlyph, PlanTabGlyph, TrackTabGlyph } from './ui/glyphs';

// Try to import LiquidGlassView with fallback
let LiquidGlassView: React.ComponentType<any> | null = null;
let isLiquidGlassSupported = false;

try {
  const liquidGlassModule = require('@callstack/liquid-glass');
  LiquidGlassView = liquidGlassModule.LiquidGlassView;
  isLiquidGlassSupported = liquidGlassModule.isLiquidGlassSupported ?? false;
} catch (error) {
  // Module not available or not linked
  console.warn('LiquidGlass module not available, using fallback:', error);
}

const BAR_GUTTER = 10;
const BAR_BOTTOM = 14;
const SHEEN_HEIGHT = 28;

const TAB_GLYPHS: Record<string, React.FC<{ color?: string }>> = {
  Track: TrackTabGlyph,
  Data: DataTabGlyph,
  Plan: PlanTabGlyph,
};

/** Space a scrolling tab screen needs under its content to clear the bar. */
export const TAB_BAR_CLEARANCE = 92;

const Rim: React.FC = () => (
  <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
    <Defs>
      {/* 155deg in CSS runs from top-left towards bottom-right. */}
      <LinearGradient id="rim" x1="0.3" y1="0" x2="0.7" y2="1">
        {glass.rimStops.map((s) => (
          <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
        ))}
      </LinearGradient>
    </Defs>
    <Rect x={0} y={0} width="100%" height="100%" rx={radius.tabBar} fill="url(#rim)" />
  </Svg>
);

const Sheen: React.FC = () => (
  <Svg style={styles.sheen} width="100%" height={SHEEN_HEIGHT} pointerEvents="none">
    <Defs>
      <LinearGradient id="sheenFill" x1="0" y1="0" x2="0" y2="1">
        <Stop offset={0} stopColor={colors.action.fill} stopOpacity={0.11} />
        <Stop offset={1} stopColor={colors.action.fill} stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Rect x={0} y={0} width="100%" height={SHEEN_HEIGHT} fill="url(#sheenFill)" />
  </Svg>
);

export const GlassTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  const items = (
    <View style={styles.items}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;
        const isFocused = state.index === index;
        const Glyph = TAB_GLYPHS[route.name] ?? TrackTabGlyph;
        const color = isFocused ? colors.action.onFill : colors.text.secondary;

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

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.item, isFocused && styles.itemActive]}
          >
            <Glyph color={color} />
            <Text style={[styles.label, { color }, !isFocused && styles.labelIdle]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const useGlass = LiquidGlassView && isLiquidGlassSupported;
  const Inner = useGlass ? LiquidGlassView! : View;

  return (
    <View style={[styles.outer, { bottom: BAR_BOTTOM + insets.bottom }]} pointerEvents="box-none">
      <Rim />
      <Inner style={[styles.inner, !useGlass && styles.innerFallback]} {...(useGlass ? { effect: 'regular' } : {})}>
        <Sheen />
        <View style={styles.highlight} pointerEvents="none" />
        {items}
      </Inner>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: BAR_GUTTER,
    right: BAR_GUTTER,
    borderRadius: radius.tabBar,
    padding: 1,
    zIndex: 99,
    ...shadow.tabBar,
  },
  inner: {
    borderRadius: radius.tabBarInner,
    overflow: 'hidden',
  },
  innerFallback: {
    backgroundColor: glass.fill,
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: glass.innerHighlight,
  },
  items: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 9,
    paddingHorizontal: 8,
  },
  item: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: radius.tabItem,
    minHeight: 44,
  },
  itemActive: {
    backgroundColor: colors.action.fill,
    ...shadow.tabItem,
  },
  label: {
    ...type.tabLabel,
  },
  labelIdle: {
    fontWeight: '400',
  },
});
