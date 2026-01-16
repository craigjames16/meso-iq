import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BottomDrawer } from '../BottomDrawer';
import { ExerciseDetail } from '../../types/exercise';
import { dashboardService } from '../../services/dashboardService';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

const EXERCISE_CATEGORIES = ['BACK', 'BICEPS', 'TRICEPS', 'CHEST', 'SHOULDERS', 'HAMSTRINGS', 'QUADS', 'CALVES'];

interface EditExerciseModalProps {
  visible: boolean;
  exercise: ExerciseDetail;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export const EditExerciseModal: React.FC<EditExerciseModalProps> = ({
  visible,
  exercise,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [name, setName] = useState(exercise.name);
  const [category, setCategory] = useState(exercise.category);
  const [loading, setLoading] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(exercise.name);
      setCategory(exercise.category);
      setDeleteDialogVisible(false);
    }
  }, [visible, exercise]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Exercise name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      await dashboardService.updateExercise(exercise.id, {
        name: name.trim(),
        category,
      });
      onUpdated();
    } catch (error: any) {
      console.error('Error updating exercise:', error);
      Alert.alert('Error', error.message || 'Failed to update exercise');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await dashboardService.deleteExercise(exercise.id);
      setDeleteDialogVisible(false);
      onDeleted();
    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      Alert.alert('Error', error.message || 'Failed to delete exercise');
    } finally {
      setLoading(false);
    }
  };

  const formatCategoryName = (cat: string) => {
    return cat.charAt(0) + cat.slice(1).toLowerCase();
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      title="Edit Exercise"
      height="85%"
    >
      {!deleteDialogVisible ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Exercise Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter exercise name"
              placeholderTextColor={themeColors.text.muted}
              editable={!loading}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(value) => setCategory(value)}
                style={styles.picker}
                enabled={!loading}
              >
                {EXERCISE_CATEGORIES.map((cat) => (
                  <Picker.Item
                    key={cat}
                    label={formatCategoryName(cat)}
                    value={cat}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={() => setDeleteDialogVisible(true)}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete Exercise</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.deleteContainer}>
          <Text style={styles.deleteTitle}>Delete Exercise?</Text>
          <Text style={styles.deleteMessage}>
            Are you sure you want to delete "{exercise.name}"? This action cannot be undone.
          </Text>
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setDeleteDialogVisible(false)}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmDeleteButton]}
              onPress={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </BottomDrawer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: themeColors.text.primary,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  pickerContainer: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    overflow: 'hidden',
  },
  picker: {
    color: themeColors.text.primary,
  },
  buttonContainer: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: themeColors.primary.main,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.accent.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButtonText: {
    color: themeColors.accent.error,
  },
  deleteContainer: {
    padding: spacing.lg,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: spacing.md,
  },
  deleteMessage: {
    fontSize: 15,
    color: themeColors.text.secondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  deleteButtonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  cancelButtonText: {
    color: themeColors.text.primary,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: themeColors.accent.error,
  },
});

