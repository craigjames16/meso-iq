import React, { useEffect, useRef, useLayoutEffect, ReactNode, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_DRAWER_HEIGHT = SCREEN_HEIGHT * 0.4; // 40% of screen height
const MAX_DRAWER_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% of screen height
const CLOSE_THRESHOLD = 50; // Pixels to drag down before closing

export interface DrawerMenuItem {
  label: string;
  onPress: () => void;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface BottomDrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items?: DrawerMenuItem[];
  children?: ReactNode;
  height?: number | string;
  disableScrollView?: boolean; // When true, uses View instead of ScrollView (for VirtualizedLists)
  disableKeyboardAvoidance?: boolean; // When true, disables keyboard avoidance behavior
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  visible,
  onClose,
  title,
  items,
  children,
  height,
  disableScrollView = false,
  disableKeyboardAvoidance = false,
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const drawerHeight = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const initialHeightRef = useRef<number>(0);
  const currentHeightRef = useRef<number>(0);
  const dragStartHeightRef = useRef<number>(0);
  const isDragging = useRef(false);
  const [drawerHeightState, setDrawerHeightState] = useState<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  // Calculate initial height
  const getInitialHeight = (): number => {
    if (height) {
      if (typeof height === 'number') {
        return Math.min(height, MAX_DRAWER_HEIGHT);
      }
      if (typeof height === 'string' && height.endsWith('%')) {
        const percentage = parseFloat(height) / 100;
        return SCREEN_HEIGHT * percentage;
      }
    }
    return DEFAULT_DRAWER_HEIGHT;
  };

  // Listen to height animation changes and update state
  useEffect(() => {
    const listenerId = drawerHeight.addListener(({ value }) => {
      setDrawerHeightState(value);
    });

    return () => {
      drawerHeight.removeListener(listenerId);
    };
  }, [drawerHeight]);

  // Reset animation values synchronously when modal becomes visible
  useLayoutEffect(() => {
    if (visible) {
      const initialHeight = getInitialHeight();
      initialHeightRef.current = initialHeight;
      currentHeightRef.current = initialHeight;
      setDrawerHeightState(initialHeight);
      overlayOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
      drawerHeight.setValue(initialHeight);
      dragY.setValue(0);
      isDragging.current = false;
    }
  }, [visible, overlayOpacity, slideAnim, drawerHeight, dragY, height]);

  useEffect(() => {
    if (visible) {
      const initialHeight = initialHeightRef.current;
      // Animate in
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(drawerHeight, {
          toValue: initialHeight,
          tension: 100,
          friction: 12,
          useNativeDriver: false, // Height animation can't use native driver
        }),
      ]).start(() => {
        currentHeightRef.current = initialHeight;
      });
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(drawerHeight, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, slideAnim, drawerHeight]);

  // Handle keyboard show/hide to adjust drawer position
  useEffect(() => {
    if (!visible || disableKeyboardAvoidance) {
      setKeyboardHeight(0);
      return;
    }

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [visible, disableKeyboardAvoidance]);

  // PanResponder for drag gestures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to vertical drags
          return Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: () => {
          isDragging.current = true;
          dragStartHeightRef.current = currentHeightRef.current;
          dragY.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isDragging.current) return;
          
          const startHeight = dragStartHeightRef.current;
          const dragDelta = -gestureState.dy; // Negative because dragging up increases height
          
          // Calculate new height based on start height
          let newHeight = startHeight + dragDelta;
          
          // Clamp between minimum and maximum
          newHeight = Math.max(DEFAULT_DRAWER_HEIGHT, Math.min(newHeight, MAX_DRAWER_HEIGHT));
          
          // Update the height
          currentHeightRef.current = newHeight;
          drawerHeight.setValue(newHeight);
          dragY.setValue(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          isDragging.current = false;
          const dragDelta = gestureState.dy;
          const currentHeight = currentHeightRef.current;
          
          // If dragged down past threshold, close the drawer
          if (dragDelta > CLOSE_THRESHOLD) {
            Animated.parallel([
              Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(drawerHeight, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start(() => {
              onClose();
            });
          } else {
            // Snap to nearest reasonable height
            let targetHeight = currentHeight;
            
            // If dragged up significantly, expand to max
            if (dragDelta < -50) {
              targetHeight = MAX_DRAWER_HEIGHT;
            }
            // If dragged down slightly, return to initial
            else if (dragDelta > 20) {
              targetHeight = initialHeightRef.current;
            }
            // Otherwise, snap to nearest third (min, mid, max)
            else {
              const third = (MAX_DRAWER_HEIGHT - DEFAULT_DRAWER_HEIGHT) / 3;
              if (currentHeight < DEFAULT_DRAWER_HEIGHT + third) {
                targetHeight = DEFAULT_DRAWER_HEIGHT;
              } else if (currentHeight < DEFAULT_DRAWER_HEIGHT + third * 2) {
                targetHeight = DEFAULT_DRAWER_HEIGHT + third;
              } else {
                targetHeight = MAX_DRAWER_HEIGHT;
              }
            }
            
            // Animate to target height
            currentHeightRef.current = targetHeight;
            Animated.spring(drawerHeight, {
              toValue: targetHeight,
              tension: 100,
              friction: 12,
              useNativeDriver: false,
            }).start(() => {
              initialHeightRef.current = targetHeight;
              currentHeightRef.current = targetHeight;
            });
            
            // Reset drag offset
            Animated.spring(dragY, {
              toValue: 0,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [drawerHeight, dragY, overlayOpacity, slideAnim, onClose]
  );

  const handleItemPress = (item: DrawerMenuItem) => {
    onClose();
    // Small delay to let the drawer close smoothly
    setTimeout(() => {
      item.onPress();
    }, 100);
  };

  // Render content (menu items and children)
  const renderContent = () => {
    const content = (
      <>
        {/* Menu Items */}
        {items && items.length > 0 && (
          <View style={styles.itemsContainer}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === items.length - 1 && styles.menuItemLast,
                  item.disabled && styles.menuItemDisabled,
                ]}
                onPress={() => !item.disabled && handleItemPress(item)}
                activeOpacity={item.disabled ? 1 : 0.7}
                disabled={item.disabled}
              >
                {item.icon && (
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={
                      item.disabled
                        ? themeColors.text.disabled
                        : item.destructive
                        ? themeColors.accent.error
                        : themeColors.text.primary
                    }
                    style={styles.menuItemIcon}
                  />
                )}
                <Text
                  style={[
                    styles.menuItemText,
                    item.destructive && styles.menuItemTextDestructive,
                    item.disabled && styles.menuItemTextDisabled,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Custom content */}
        {children}
      </>
    );

    if (disableScrollView) {
      return <View style={styles.scrollView}>{content}</View>;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Fading black overlay */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Sliding drawer */}
        <Animated.View
          style={[
            styles.drawer,
            { 
              transform: [{ translateY: slideAnim }],
              height: drawerHeightState,
              marginBottom: keyboardHeight,
            },
          ]}
        >
          {/* Draggable handle area */}
          <View 
            style={styles.dragHandleArea}
            {...panResponder.panHandlers}
          >
            <View style={styles.handleBar} />
          </View>

          {/* Header - also draggable */}
          {title && (
            <View 
              style={styles.header}
              {...panResponder.panHandlers}
            >
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color={themeColors.text.secondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Content with keyboard avoidance */}
          {disableKeyboardAvoidance ? (
            <View style={styles.keyboardAvoidingView}>
              {renderContent()}
            </View>
          ) : (
            <KeyboardAvoidingView
              style={styles.keyboardAvoidingView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              {renderContent()}
            </KeyboardAvoidingView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawer: {
    backgroundColor: themeColors.background.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 34, // Safe area padding
    overflow: 'hidden',
  },
  dragHandleArea: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: themeColors.border.light,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  itemsContainer: {
    paddingTop: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    marginRight: spacing.md,
  },
  menuItemText: {
    fontSize: 16,
    color: themeColors.text.primary,
  },
  menuItemTextDestructive: {
    color: themeColors.accent.error,
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuItemTextDisabled: {
    color: themeColors.text.disabled,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl * 3,
  },
});

