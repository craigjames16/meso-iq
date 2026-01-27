import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { plansService } from '../../services/plansService';

interface AIPlanChatModalProps {
  visible: boolean;
  onClose: () => void;
  onPlanCreated: (planId: number) => void;
}

export const AIPlanChatModal: React.FC<AIPlanChatModalProps> = ({
  visible,
  onClose,
  onPlanCreated,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setInputText('');
      setError(null);
      setIsLoading(false);
    }
  }, [visible]);

  // Animate modal
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayOpacity]);

  const handleSend = async () => {
    const prompt = inputText.trim();
    if (!prompt || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const plan = await plansService.createPlanWithAI(prompt);
      
      // Small delay to show success, then navigate
      setTimeout(() => {
        onPlanCreated(plan.id);
        onClose();
      }, 500);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create plan. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Overlay */}
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

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: modalTranslateY }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialIcons
                name="auto-awesome"
                size={24}
                color={themeColors.primary.main}
              />
              <Text style={styles.headerTitle}>Create Plan with AI</Text>
            </View>
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
          <View style={styles.content}>
            {!isLoading ? (
              <>
                <View style={styles.iconContainer}>
                  <MaterialIcons
                    name="auto-awesome"
                    size={48}
                    color={themeColors.primary.main}
                  />
                </View>
                <Text style={styles.title}>Describe Your Workout Plan</Text>
                <Text style={styles.subtitle}>
                  Tell us what kind of workout plan you'd like to create. For example:
                </Text>
                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleText}>
                    • "Create a 4-day upper/lower split focusing on strength"
                  </Text>
                  <Text style={styles.exampleText}>
                    • "Build a 5-day push/pull/legs routine"
                  </Text>
                  <Text style={styles.exampleText}>
                    • "Make a 3-day full body plan for beginners"
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={(text) => {
                      setInputText(text);
                      setError(null);
                    }}
                    placeholder="Describe your workout plan..."
                    placeholderTextColor={themeColors.text.muted}
                    multiline
                    maxLength={500}
                    editable={!isLoading}
                    autoFocus
                  />
                  {error && (
                    <Text style={styles.errorText}>{error}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Text style={styles.sendButtonText}>Create Plan</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary.main} />
                <Text style={styles.loadingText}>Creating your plan...</Text>
                <Text style={styles.loadingSubtext}>
                  This may take a few moments
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    backgroundColor: themeColors.background.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: themeColors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: themeColors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  exampleContainer: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  exampleText: {
    fontSize: 13,
    color: themeColors.text.secondary,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: themeColors.text.primary,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 12,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sendButton: {
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginTop: spacing.md,
  },
  loadingSubtext: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginTop: spacing.xs,
  },
});
