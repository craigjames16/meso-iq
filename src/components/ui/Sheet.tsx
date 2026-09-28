import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, glass, motion, radius, space, type, size } from '../../theme';
import { IconButton } from './IconButton';
import { CloseGlyph } from './glyphs';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Set false when children include their own virtualized list. */
  scroll?: boolean;
  /** Fraction of the screen the expanded detent fills. */
  maxHeight?: number;
  /** Fixed fraction of the screen to rest at, for sheets whose content changes size. */
  height?: number;
  /**
   * Runs once the sheet is off the screen and its modal has gone. Anything that
   * presents another modal — a second sheet, an alert — waits for this, because
   * iOS drops a presentation that starts while one is still being dismissed.
   */
  onClosed?: () => void;
}

/** Where a sheet rests when its content is taller than that. */
const REST_FRACTION = 0.55;
/** A second detent only earns its place if it reveals meaningfully more. */
const EXPAND_MIN_GAIN = 64;
/** How far below its resting size a sheet has to land before it closes instead. */
const DISMISS_DISTANCE = 90;
/**
 * Projects where a flick would come to rest, the way scroll deceleration does:
 * `(v / 1000) · d / (1 - d)` with `d = 0.998`, for a velocity in points per ms.
 */
const PROJECTION = 499;
const OPEN_MS = 240;
const CLOSE_MS = 200;

/** Resistance past a boundary, so an edge slows the drag instead of stopping it. */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  footer,
  children,
  scroll = true,
  maxHeight = 0.9,
  height,
  onClosed,
}) => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const [mounted, setMounted] = useState(visible);
  const [measured, setMeasured] = useState<number | null>(null);
  /**
   * `auto` lets the sheet size to its content, which is how most sheets read.
   * Moving between detents needs a height to animate, so a drag switches to
   * `fixed` and settling back at rest hands the sizing to the content again.
   */
  const [sizing, setSizing] = useState<'auto' | 'fixed'>(height ? 'fixed' : 'auto');

  const restCap = screenHeight * (height ?? REST_FRACTION);
  const expandedCap = screenHeight * maxHeight;
  const restShown = height ? restCap : Math.min(measured ?? restCap, restCap);
  // Only a sheet whose content is cut off at rest has anywhere to expand to.
  const clipped = height != null || (measured ?? 0) >= restCap - 1;
  const expandable = clipped && expandedCap - restShown >= EXPAND_MIN_GAIN;

  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const sheetHeight = useRef(new Animated.Value(restCap)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  // The gesture runs outside React, so it reads geometry from here.
  const geometry = useRef({ restShown, expandedCap, expandable, detent: restShown, live: restShown, start: 0 });
  geometry.current.restShown = restShown;
  geometry.current.expandedCap = expandedCap;
  geometry.current.expandable = expandable;
  if (sizing === 'auto') {
    geometry.current.detent = restShown;
    geometry.current.live = restShown;
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(screenHeight);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: OPEN_MS, useNativeDriver: true }),
        Animated.timing(scrim, { toValue: glass.scrimOpacity, duration: OPEN_MS, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: screenHeight, duration: CLOSE_MS, useNativeDriver: true }),
        Animated.timing(scrim, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }),
      ]).start(() => {
        setMounted(false);
        // Next time it opens it opens at rest, sized to whatever it holds then.
        setSizing(height ? 'fixed' : 'auto');
        setMeasured(null);
        // A frame later the modal has been unmounted and torn down, so whatever
        // comes next is free to present.
        requestAnimationFrame(() => onClosedRef.current?.());
      });
    }
    // `mounted` is read only to skip the close animation on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, screenHeight, translateY, scrim]);

  const pan = useRef(
    PanResponder.create({
      // Capture, so the drag still works when the finger lands on the handle or
      // the close button rather than bare header.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      // Once the header has the gesture it keeps it; the body must not steal it.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const g = geometry.current;
        g.start = g.live;
        if (g.expandable) {
          // Take over the height at exactly what the content settled on, so the
          // switch out of content sizing doesn't move anything.
          sheetHeight.setValue(g.live);
          setSizing('fixed');
        }
      },
      onPanResponderMove: (_, gesture) => {
        const g = geometry.current;
        let shown = g.start - gesture.dy;
        if (shown > g.expandedCap) {
          shown = g.expandedCap + rubberband(shown - g.expandedCap, g.expandedCap);
        }
        if (!g.expandable) {
          shown = Math.min(shown, g.restShown);
        }
        g.live = shown;
        if (shown >= g.restShown) {
          sheetHeight.setValue(shown);
          translateY.setValue(0);
        } else {
          // Below its smallest detent the sheet stops shrinking and slides away,
          // so the footer stays put instead of being eaten from the bottom.
          sheetHeight.setValue(g.restShown);
          translateY.setValue(g.restShown - shown);
        }
      },
      onPanResponderRelease: (_, gesture) => settle(gesture.vy),
      onPanResponderTerminate: () => settle(0),
    }),
  ).current;

  // These are recreated each render but only ever called from a gesture or a
  // press, which reach the current ones through this ref.
  const settleRef = useRef<(vy: number) => void>(() => {});
  const settle = (vy: number) => settleRef.current(vy);

  const animateTo = (target: number, vy: number) => {
    const g = geometry.current;
    g.detent = target;
    g.live = target;
    Animated.parallel([
      // The springs pick up the finger's speed, so there is no seam between
      // dragging the sheet and watching it land.
      Animated.spring(sheetHeight, { toValue: target, useNativeDriver: false, velocity: -vy * 1000, ...motion.sheet }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, velocity: vy * 1000, ...motion.sheet }),
    ]).start(({ finished }) => {
      if (finished && target === g.restShown && height == null) {
        setSizing('auto');
      }
    });
  };

  settleRef.current = (vy: number) => {
    const g = geometry.current;
    // Where the flick would come to rest, rather than where the finger left off.
    const projected = g.live - vy * PROJECTION;
    if (projected < g.restShown - DISMISS_DISTANCE) {
      onCloseRef.current();
      return;
    }
    const midpoint = (g.restShown + g.expandedCap) / 2;
    animateTo(g.expandable && projected >= midpoint ? g.expandedCap : g.restShown, vy);
  };

  const onSheetLayout = (event: LayoutChangeEvent) => {
    if (sizing === 'auto') {
      setMeasured(event.nativeEvent.layout.height);
    }
  };

  /** Moves to `target` without a gesture, for a tap or an accessibility action. */
  const goTo = (target: number) => {
    const g = geometry.current;
    if (target > g.restShown && !g.expandable) return;
    sheetHeight.setValue(g.live);
    setSizing('fixed');
    animateTo(target, 0);
  };

  const toggleDetent = () => {
    if (!expandable) return;
    goTo(geometry.current.detent > restShown ? restShown : expandedCap);
  };

  const onHandleAction = (event: { nativeEvent: { actionName: string } }) => {
    const g = geometry.current;
    if (event.nativeEvent.actionName === 'increment') {
      if (expandable && g.detent <= restShown) goTo(expandedCap);
    } else if (g.detent > restShown) {
      goTo(restShown);
    } else {
      onClose();
    }
  };

  if (!mounted) return null;

  const sizeStyle = sizing === 'fixed' ? { height: sheetHeight } : { maxHeight: restCap };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
          <Animated.View style={{ transform: [{ translateY }] }}>
            <Animated.View style={[styles.sheet, sizeStyle]} onLayout={onSheetLayout} accessibilityViewIsModal>
              <View {...pan.panHandlers} style={styles.header}>
                <Pressable
                  style={styles.handleRow}
                  onPress={toggleDetent}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Sheet size"
                  accessibilityHint={expandable ? 'Swipe up to expand, down to shrink or close' : 'Swipe down to close'}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                  onAccessibilityAction={onHandleAction}
                >
                  <View style={styles.handle} />
                </Pressable>
                <View style={styles.titleRow}>
                  <View style={styles.titles}>
                    <Text style={styles.title} accessibilityRole="header">
                      {title}
                    </Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                  </View>
                  <IconButton
                    icon={<CloseGlyph />}
                    onPress={onClose}
                    accessibilityLabel="Close"
                    size={30}
                    variant="round"
                    style={styles.close}
                  />
                </View>
              </View>
              {scroll ? (
                <ScrollView
                  style={sizing === 'fixed' ? styles.flex : styles.shrink}
                  contentContainerStyle={styles.body}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={[styles.body, styles.flex]}>{children}</View>
              )}
              <View style={[styles.footer, { paddingBottom: space.sheetPadBottom + insets.bottom }]}>{footer}</View>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: colors.border.field,
  },
  header: {
    paddingHorizontal: space.sheetPadX,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 16,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.cell,
    backgroundColor: colors.border.strong,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  titles: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...type.sheetTitle,
    color: colors.text.primary,
  },
  subtitle: {
    ...type.meta,
    fontSize: size.metaMid,
    color: colors.text.muted,
  },
  close: {
    borderColor: colors.surface.field,
  },
  flex: {
    flex: 1,
  },
  shrink: {
    flexGrow: 0,
  },
  body: {
    paddingHorizontal: space.sheetPadX,
    paddingBottom: 12,
    gap: 16,
  },
  footer: {
    paddingHorizontal: space.sheetPadX,
    paddingTop: 4,
  },
});
