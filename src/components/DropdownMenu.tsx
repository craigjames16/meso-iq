import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../theme/colors';

export interface DropdownMenuItem {
  label: string;
  onPress: () => void;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  items: DropdownMenuItem[];
  anchorRef?: React.RefObject<View>;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  visible,
  onClose,
  items,
  anchorRef,
}) => {
  const menuRef = useRef<View>(null);

  useEffect(() => {
    if (!visible) return;
    
    // Close menu when clicking outside
    const handleBackdrop = () => {
      onClose();
    };

    return () => {
      // Cleanup if needed
    };
  }, [visible, onClose]);

  const handleItemPress = (item: DropdownMenuItem) => {
    if (item.disabled) return;
    onClose();
    // Small delay to let the menu close smoothly
    setTimeout(() => {
      item.onPress();
    }, 100);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer} ref={menuRef}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index === items.length - 1 && styles.menuItemLast,
                    item.disabled && styles.menuItemDisabled,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={item.disabled ? 1 : 0.7}
                  disabled={item.disabled}
                >
                  {item.icon && (
                    <MaterialIcons
                      name={item.icon}
                      size={20}
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: spacing.md,
  },
  menuContainer: {
    backgroundColor: themeColors.background.secondary,
    borderRadius: borderRadius.md,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemIcon: {
    marginRight: spacing.sm,
  },
  menuItemText: {
    fontSize: 16,
    color: themeColors.text.primary,
    flex: 1,
  },
  menuItemTextDestructive: {
    color: themeColors.accent.error,
  },
  menuItemTextDisabled: {
    color: themeColors.text.disabled,
  },
});

