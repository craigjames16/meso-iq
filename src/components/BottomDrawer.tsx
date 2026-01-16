import React, { useEffect, useRef, useLayoutEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  visible,
  onClose,
  title,
  items,
  children,
  height,
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Reset animation values synchronously when modal becomes visible
  useLayoutEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, overlayOpacity, slideAnim]);

  useEffect(() => {
    if (visible) {
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
      ]).start();
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
      ]).start();
    }
  }, [visible, overlayOpacity, slideAnim]);

  const handleItemPress = (item: DrawerMenuItem) => {
    onClose();
    // Small delay to let the drawer close smoothly
    setTimeout(() => {
      item.onPress();
    }, 100);
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
            { transform: [{ translateY: slideAnim }] },
            height ? { height: height as any } : undefined,
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          {title && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color={themeColors.text.secondary} />
              </TouchableOpacity>
            </View>
          )}

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
    maxHeight: '80%',
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: themeColors.border.light,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
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
});

