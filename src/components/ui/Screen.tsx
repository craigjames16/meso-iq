import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../../theme';
import { GlassBackdrop } from './GlassBackdrop';
import { ScrollEdge, SCROLL_EDGE_HEIGHT } from './ScrollEdge';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Tab screens clear the floating tab bar; stack screens don't need to. */
  bottom?: 'tabBar' | 'footer' | 'none';
  /** Detail screens with their own header handle the top inset themselves. */
  topInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
  /**
   * Pinned to the top of the screen, with the content scrolling underneath it.
   * It takes over the screen's top padding, so the content clears it.
   */
  header?: React.ReactNode;
}

const FOOTER_CLEARANCE = 96;

/** A title row's height. It holds the first frame in place until the header measures itself. */
const HEADER_ESTIMATE = 62;

/**
 * Scroll distance over which the pinned header becomes a floating layer: the
 * material and its soft bottom edge arrive together, as content reaches them.
 * It can't run longer than the header's bottom padding, because that gap is
 * all the runway there is before content is behind the title.
 */
const CHROME_TRAVEL = space.sectionGap;

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = true,
  refreshControl,
  bottom = 'tabBar',
  topInset = true,
  contentStyle,
  footer,
  keyboardShouldPersistTaps = 'handled',
  header,
}) => {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);

  const top = (topInset ? insets.top : 0) + space.screenTop;
  const paddingBottom =
    bottom === 'tabBar'
      ? space.screenBottom + insets.bottom
      : bottom === 'footer'
        ? FOOTER_CLEARANCE + insets.bottom
        : space.screenTop + insets.bottom;
  const headerInset = headerHeight ?? top + HEADER_ESTIMATE;
  const padding = {
    paddingTop: header ? headerInset : top,
    paddingBottom,
  };

  // The refresh spinner belongs below the header, not behind it.
  const control =
    header && refreshControl
      ? React.cloneElement(refreshControl, { progressViewOffset: headerInset })
      : refreshControl;

  const onHeaderLayout = (event: LayoutChangeEvent) => setHeaderHeight(event.nativeEvent.layout.height);
  const chrome = scrollY.interpolate({ inputRange: [0, CHROME_TRAVEL], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.root}>
      {scroll ? (
        <Animated.ScrollView
          style={styles.root}
          contentContainerStyle={[styles.content, padding, contentStyle]}
          refreshControl={control}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode="on-drag"
          onScroll={
            header
              ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })
              : undefined
          }
          scrollEventThrottle={16}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.root, styles.content, padding, contentStyle]}>{children}</View>
      )}
      {header ? (
        <View style={[styles.header, { paddingTop: top }]} onLayout={onHeaderLayout} pointerEvents="box-none">
          <GlassBackdrop opacity={chrome} />
          {header}
          <Animated.View pointerEvents="none" style={[styles.edge, { opacity: chrome }]}>
            <ScrollEdge />
          </Animated.View>
        </View>
      ) : null}
      {footer}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    gap: space.sectionGap,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.gutter,
    paddingBottom: space.sectionGap,
    gap: space.sectionGap,
  },
  // Sits below the header, dissolving the content into the material.
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -SCROLL_EDGE_HEIGHT,
    height: SCROLL_EDGE_HEIGHT,
  },
});
