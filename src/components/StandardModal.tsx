import React, { useEffect, useRef, useLayoutEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../theme/colors';

interface StandardModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  contentStyle?: object;
  scrollable?: boolean;
  maxHeight?: string | number;
}

export const StandardModal: React.FC<StandardModalProps> = ({
  visible,
  onClose,
  title,
  children,
  contentStyle,
  scrollable = false,
  maxHeight = '90%',
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Reset animation values synchronously when modal becomes visible
  useLayoutEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible, overlayOpacity, slideAnim]);

  // Animate overlay fade and modal slide
  useEffect(() => {
    if (visible) {
      // Start animations after a brief delay to ensure modal is rendered
      const timer = setTimeout(() => {
        // Fade in overlay
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
        
        // Slide up modal (without native driver for better compatibility)
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: false,
        }).start();
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // Fade out overlay
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Slide down modal
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: false,
      }).start((finished) => {
        if (finished) {
          // Ensure values are reset after close animation completes
          overlayOpacity.setValue(0);
          slideAnim.setValue(300);
        }
      });
    }
  }, [visible, overlayOpacity, slideAnim]);

  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlayTouchable}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalTouchable}
          >
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                  maxHeight: maxHeight as number | `${number}%`,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={themeColors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Content */}
              {content}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayTouchable: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: themeColors.background.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    height: '90%',
    maxHeight: '90%',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});

