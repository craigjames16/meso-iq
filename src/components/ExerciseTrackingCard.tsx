import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { workoutService } from '../services/workoutService';
import { ExerciseHistoryModal, HistoryInstance } from './ExerciseHistoryModal';
import { themeColors, spacing, borderRadius } from '../theme/colors';

export interface ExerciseSet {
  id?: number;
  reps: number;
  weight: number;
  setNumber?: number;
  completed?: boolean;
  lastSet?: {
    reps: number;
    weight: number;
    setNumber: number;
  } | null;
}

export interface ExerciseTracking {
  exerciseId: number;
  exerciseName: string;
  order: number;
  sets: ExerciseSet[];
  history?: HistoryInstance[];
  mesocycleHistory?: HistoryInstance[];
}

interface ExerciseTrackingCardProps {
  exercise: ExerciseTracking;
  exerciseIndex: number;
  workoutInstanceId: number;
  isWorkoutCompleted: boolean;
  totalExercises: number;
  workoutInstance?: any;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => void;
  onSetCompletion: (exerciseIndex: number, setIndex: number, completed: boolean) => Promise<void>;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onReorderExercise: (exerciseIndex: number, direction: 'up' | 'down') => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onShowHistory?: (exercise: ExerciseTracking) => void;
}

export const ExerciseTrackingCard: React.FC<ExerciseTrackingCardProps> = ({
  exercise,
  exerciseIndex,
  workoutInstanceId,
  isWorkoutCompleted,
  totalExercises,
  workoutInstance,
  onUpdateSet,
  onSetCompletion,
  onAddSet,
  onRemoveExercise,
  onReorderExercise,
  onRemoveSet,
  onShowHistory,
}) => {
  const [exerciseMenuVisible, setExerciseMenuVisible] = useState(false);
  const [setMenuVisible, setSetMenuVisible] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Calculate last volume from mesocycle history
  const getLastVolume = () => {
    if (exercise.mesocycleHistory && exercise.mesocycleHistory.length > 0) {
      const lastWorkout = exercise.mesocycleHistory[exercise.mesocycleHistory.length - 1];
      return lastWorkout?.volume || 0;
    }
    return null;
  };

  const lastVolume = getLastVolume();

  const handleExerciseMenuOpen = () => {
    setExerciseMenuVisible(true);
  };

  const handleExerciseMenuClose = () => {
    setExerciseMenuVisible(false);
  };

  const handleSetMenuOpen = (setIndex: number) => {
    setActiveSetIndex(setIndex);
    setSetMenuVisible(true);
  };

  const handleSetMenuClose = () => {
    setSetMenuVisible(false);
    setActiveSetIndex(null);
  };

  const handleAddSet = () => {
    onAddSet(exerciseIndex);
    handleExerciseMenuClose();
  };

  const handleRemoveExercise = () => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to remove ${exercise.exerciseName}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: handleExerciseMenuClose },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onRemoveExercise(exerciseIndex);
            handleExerciseMenuClose();
          },
        },
      ]
    );
  };

  const handleReorderExercise = (direction: 'up' | 'down') => {
    onReorderExercise(exerciseIndex, direction);
    handleExerciseMenuClose();
  };

  const handleRemoveSet = () => {
    if (activeSetIndex !== null) {
      onRemoveSet(exerciseIndex, activeSetIndex);
      handleSetMenuClose();
    }
  };

  return (
    <>
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseHeaderLeft}>
            <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
            <Text style={styles.setsCompleted}>
              {exercise.sets.filter(s => s.completed).length} of {exercise.sets.length} sets completed
            </Text>
          </View>
          <View style={styles.exerciseHeaderRight}>
            {/* Last Volume Display */}
            {lastVolume !== null && (
              <View style={styles.lastVolumeContainer}>
                <Text style={styles.lastVolumeLabel}>Last Volume</Text>
                <Text style={styles.lastVolumeValue}>{lastVolume.toLocaleString()} lbs</Text>
              </View>
            )}
            {/* Action Buttons */}
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(true)}
                style={styles.historyButton}
              >
                <MaterialIcons name="info-outline" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExerciseMenuOpen}
                disabled={isWorkoutCompleted}
                style={styles.exerciseMenuButton}
              >
                <MaterialIcons name="more-vert" size={24} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {exercise.sets.map((set, setIndex) => (
          <View key={setIndex} style={styles.setRow}>
            <View style={[styles.setNumberContainer, set.completed && styles.setNumberContainerCompleted]}>
              <Text style={[styles.setNumber, set.completed && styles.setNumberCompleted]}>
                {setIndex + 1}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleSetMenuOpen(setIndex)}
              disabled={isWorkoutCompleted}
              style={styles.setMenuButton}
            >
              <MaterialIcons name="more-vert" size={20} color="#999" />
            </TouchableOpacity>
            <View style={styles.setInputs}>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Text style={styles.inputLabel}>Weight</Text>
                  
                </View>
                <TextInput
                  style={[styles.input, set.completed && styles.inputCompleted]}
                  value={set.weight > 0 ? set.weight.toString() : ''}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    onUpdateSet(exerciseIndex, setIndex, 'weight', value);
                  }}
                  keyboardType="numeric"
                  editable={!isWorkoutCompleted && !set.completed}
                  placeholder={set.lastSet?.weight.toString() || '0'}
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Text style={styles.inputLabel}>Reps</Text>
                 
                </View>
                <TextInput
                  style={[styles.input, set.completed && styles.inputCompleted]}
                  value={set.reps > 0 ? set.reps.toString() : ''}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    onUpdateSet(exerciseIndex, setIndex, 'reps', value);
                  }}
                  keyboardType="numeric"
                  editable={!isWorkoutCompleted && !set.completed}
                  placeholder={set.lastSet?.reps.toString() || '0'}
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.completeButton,
                set.completed ? styles.completeButtonActive : styles.completeButtonInactive,
              ]}
              onPress={() => onSetCompletion(exerciseIndex, setIndex, !set.completed)}
              disabled={isWorkoutCompleted}
            >
              <MaterialIcons
                name={set.completed ? 'check-circle' : 'radio-button-unchecked'}
                size={24}
                color={set.completed ? '#4CAF50' : '#666'}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Exercise Menu Modal */}
      <Modal
        visible={exerciseMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleExerciseMenuClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleExerciseMenuClose}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={[
                styles.menuItem,
                (exerciseIndex === 0 || isWorkoutCompleted) && styles.menuItemDisabled,
              ]}
              onPress={() => handleReorderExercise('up')}
              disabled={exerciseIndex === 0 || isWorkoutCompleted}
            >
              <MaterialIcons name="arrow-upward" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Move Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                (exerciseIndex === totalExercises - 1 || isWorkoutCompleted) && styles.menuItemDisabled,
              ]}
              onPress={() => handleReorderExercise('down')}
              disabled={exerciseIndex === totalExercises - 1 || isWorkoutCompleted}
            >
              <MaterialIcons name="arrow-downward" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Move Down</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, isWorkoutCompleted && styles.menuItemDisabled]}
              onPress={handleAddSet}
              disabled={isWorkoutCompleted}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Add Set</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleRemoveExercise}
            >
              <MaterialIcons name="delete" size={20} color="#ff4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete Exercise</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Set Menu Modal */}
      <Modal
        visible={setMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSetMenuClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleSetMenuClose}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleRemoveSet}
            >
              <MaterialIcons name="delete" size={20} color="#ff4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete Set</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exercise History Modal */}
      <ExerciseHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        exerciseName={exercise.exerciseName}
        history={exercise.history || []}
      />
    </>
  );
};

const styles = StyleSheet.create({
  exerciseCard: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseHeaderLeft: {
    flex: 1,
  },
  exerciseHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: 4,
  },
  setsCompleted: {
    fontSize: 13,
    color: themeColors.text.muted,
    fontWeight: '500',
  },
  lastVolumeContainer: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  lastVolumeLabel: {
    fontSize: 10,
    color: themeColors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastVolumeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.accent.success,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyButton: {
    padding: spacing.xs,
  },
  exerciseMenuButton: {
    padding: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 12,
    width: '100%',
    paddingHorizontal: 16,
  },
  setNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  setNumberContainerCompleted: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  setNumber: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  setNumberCompleted: {
    color: '#fff',
  },
  setMenuButton: {
    padding: 4,
    paddingBottom: 12,
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: themeColors.text.muted,
  },
  lastSetHint: {
    fontSize: 11,
    color: themeColors.primary.main,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  inputCompleted: {
    backgroundColor: '#2a4a2a',
    borderColor: '#4CAF50',
  },
  completeButton: {
    paddingBottom: 12,
  },
  completeButtonActive: {},
  completeButtonInactive: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#444',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemDanger: {},
  menuItemText: {
    color: '#fff',
    fontSize: 16,
  },
  menuItemTextDanger: {
    color: '#ff4444',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 4,
  },
});

