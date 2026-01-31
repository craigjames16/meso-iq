import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { workoutService } from '../services/workoutService';
import { ExerciseHistoryModal, HistoryInstance } from './ExerciseHistoryModal';
import { BottomDrawer } from './BottomDrawer';
import { themeColors, spacing, borderRadius } from '../theme/colors';

export interface ExerciseSet {
  id?: number;
  reps: number;
  weight: number;
  setNumber?: number;
  completed?: boolean;
  loading?: boolean;
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

// Animated wrapper for set row background
const AnimatedSetRowBackground: React.FC<{
  completed: boolean;
  children: React.ReactNode;
  style: any;
}> = ({ completed, children, style }) => {
  const fadeAnim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: completed ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [completed, fadeAnim]);

  const backgroundColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(76, 175, 80, 0.15)'],
  });

  const borderLeftColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#4CAF50'],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor,
          borderLeftWidth: 3,
          borderLeftColor,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Animated input wrapper for fade effect on completion
const AnimatedInput: React.FC<{
  completed: boolean;
  style: any;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType: 'numeric';
  editable: boolean;
  placeholder: string;
  placeholderTextColor: string;
}> = ({ completed, style, ...props }) => {
  const fadeAnim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: completed ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [completed, fadeAnim]);

  const backgroundColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#333', '#2a4a2a'],
  });

  const borderColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#444', '#4CAF50'],
  });

  return (
    <Animated.View style={[style, { backgroundColor, borderColor }]}>
      <TextInput
        style={styles.inputInner}
        {...props}
      />
    </Animated.View>
  );
};

// Animated set number for fade effect on completion
const AnimatedSetNumber: React.FC<{
  completed: boolean;
  setNumber: number;
}> = ({ completed, setNumber }) => {
  const fadeAnim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: completed ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [completed, fadeAnim]);

  const backgroundColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#4CAF50'],
  });

  const borderColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#666', '#4CAF50'],
  });

  const textColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#999', '#fff'],
  });

  return (
    <Animated.View style={[styles.setNumberContainer, { backgroundColor, borderColor }]}>
      <Animated.Text style={[styles.setNumber, { color: textColor }]}>
        {setNumber}
      </Animated.Text>
    </Animated.View>
  );
};

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleExerciseNamePress = () => {
    navigation.navigate('ExerciseDetail', { exerciseId: exercise.exerciseId });
  };

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
                onPress={handleExerciseNamePress}
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
          <AnimatedSetRowBackground key={setIndex} completed={!!set.completed} style={styles.setRow}>
            <AnimatedSetNumber completed={!!set.completed} setNumber={setIndex + 1} />
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
                <AnimatedInput
                  completed={!!set.completed}
                  style={styles.input}
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
                <Text style={styles.lastSetHint}>
                  Last: {set.lastSet?.weight ?? '-'}
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Text style={styles.inputLabel}>Reps</Text>
                </View>
                <AnimatedInput
                  completed={!!set.completed}
                  style={styles.input}
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
                <Text style={styles.lastSetHint}>
                  Last: {set.lastSet?.reps ?? '-'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.completeButton,
                set.completed ? styles.completeButtonActive : styles.completeButtonInactive,
              ]}
              onPress={() => onSetCompletion(exerciseIndex, setIndex, !set.completed)}
              disabled={isWorkoutCompleted || set.loading}
            >
              {set.loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : set.completed ? (
                <MaterialIcons name="check" size={18} color="#fff" />
              ) : null}
            </TouchableOpacity>
          </AnimatedSetRowBackground>
        ))}
      </View>

      {/* Exercise Menu */}
      <BottomDrawer
        visible={exerciseMenuVisible}
        onClose={handleExerciseMenuClose}
        title={exercise.exerciseName}
        items={[
          {
            label: 'Move Up',
            icon: 'arrow-upward',
            onPress: () => handleReorderExercise('up'),
            disabled: exerciseIndex === 0 || isWorkoutCompleted,
          },
          {
            label: 'Move Down',
            icon: 'arrow-downward',
            onPress: () => handleReorderExercise('down'),
            disabled: exerciseIndex === totalExercises - 1 || isWorkoutCompleted,
          },
          {
            label: 'Add Set',
            icon: 'add',
            onPress: handleAddSet,
            disabled: isWorkoutCompleted,
          },
          {
            label: 'Delete Exercise',
            icon: 'delete',
            onPress: handleRemoveExercise,
            destructive: true,
          },
        ]}
      />

      {/* Set Menu */}
      <BottomDrawer
        visible={setMenuVisible}
        onClose={handleSetMenuClose}
        title={`Set ${activeSetIndex !== null ? activeSetIndex + 1 : ''}`}
        items={[
          {
            label: 'Delete Set',
            icon: 'delete',
            onPress: handleRemoveSet,
            destructive: true,
          },
        ]}
      />

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
    marginHorizontal: spacing.xs,
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
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  setNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: themeColors.text.muted,
    fontWeight: '500',
    marginTop: 4,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputInner: {
    padding: 12,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  inputCompleted: {
    backgroundColor: '#2a4a2a',
    borderColor: '#4CAF50',
  },
  completeButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  completeButtonInactive: {
    backgroundColor: 'transparent',
  },
});

