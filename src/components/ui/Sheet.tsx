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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, glass, radius, space, type, size } from '../../theme';
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
  /** Fraction of the screen the sheet may fill. */
  maxHeight?: number;
  /** Fixed fraction of the screen, for sheets whose content changes size. */
  height?: number;
}

const CLOSE_DISTANCE = 90;
const CLOSE_VELOCITY = 0.9;
const OPEN_MS = 240;
const CLOSE_MS = 200;

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
}) => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
      ]).start(() => setMounted(false));
    }
    // `mounted` is read only to skip the close animation on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, screenHeight, translateY, scrim]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  if (!mounted) return null;

  const sheetHeightStyle = height
    ? { height: screenHeight * height }
    : { maxHeight: screenHeight * maxHeight };

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
          <Animated.View
            style={[styles.sheet, sheetHeightStyle, { transform: [{ translateY }] }]}
            accessibilityViewIsModal
          >
            <View {...pan.panHandlers} style={styles.header}>
              <View style={styles.handleRow}>
                <View style={styles.handle} />
              </View>
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
                style={height ? styles.flex : styles.shrink}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.body, styles.flex]}>{children}</View>
            )}
            <View style={[styles.footer, { paddingBottom: space.sheetPadBottom + insets.bottom }]}>
              {footer}
            </View>
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
