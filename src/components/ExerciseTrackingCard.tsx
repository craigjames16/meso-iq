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
import { ExerciseHistoryModal, HistoryInstance } from './ExerciseHistoryModal';
import { BottomDrawer } from './BottomDrawer';
import { exercisesService } from '../services/exercisesService';
import { themeColors, spacing, borderRadius } from '../theme/colors';

export interface ExerciseSet {
  id?: number;
  reps: number;
  weight: number;
  setNumber?: number; // Main set number (1, 2, 3, etc.)
  subSetNumber?: number | null; // Sub-set number (null for main sets, 1, 2, 3 for sub-sets)
  setType?: 'REGULAR' | 'DROP_SET' | 'MYO_REP';
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
  onConvertSetType?: (exerciseIndex: number, setIndex: number, setType: 'REGULAR' | 'DROP_SET' | 'MYO_REP') => void;
  onAddSubSet?: (exerciseIndex: number, parentSetIndex: number) => void;
  onShowHistory?: (exercise: ExerciseTracking) => void;
}

// Helper function to format set number
const formatSetNumber = (setNumber?: number, subSetNumber?: number | null): string => {
  if (!setNumber) return '';
  if (subSetNumber !== null && subSetNumber !== undefined) {
    return `${setNumber}.${subSetNumber}`;
  }
  return setNumber.toString();
};

// Helper function to check if a set is a sub-set
const isSubSet = (set: ExerciseSet): boolean => {
  return set.subSetNumber !== null && set.subSetNumber !== undefined;
};

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
  setNumber: string | number;
  setType?: 'REGULAR' | 'DROP_SET' | 'MYO_REP';
}> = ({ completed, setNumber, setType }) => {
  const fadeAnim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: completed ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [completed, fadeAnim]);

  // Determine base colors based on set type (when not completed)
  let baseBgColor = 'transparent';
  let baseBorderColor = '#666';
  let baseTextColor = '#999';
  
  if (!completed) {
    if (setType === 'DROP_SET') {
      baseBgColor = 'rgba(33, 150, 243, 0.2)';
      baseBorderColor = '#2196F3';
      baseTextColor = '#2196F3';
    } else if (setType === 'MYO_REP') {
      baseBgColor = 'rgba(156, 39, 176, 0.2)';
      baseBorderColor = '#9C27B0';
      baseTextColor = '#9C27B0';
    }
  }

  const backgroundColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseBgColor, '#4CAF50'],
  });

  const borderColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseBorderColor, '#4CAF50'],
  });

  const textColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseTextColor, '#fff'],
  });

  return (
    <Animated.View style={[styles.setNumberContainer, { backgroundColor, borderColor }]}>
      <Animated.Text style={[styles.setNumber, { color: textColor }]}>
        {typeof setNumber === 'number' ? setNumber : setNumber}
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
  onConvertSetType,
  onAddSubSet,
  onShowHistory,
}) => {
  console.log('ExerciseTrackingCard', exercise);
  const [exerciseMenuVisible, setExerciseMenuVisible] = useState(false);
  const [setMenuVisible, setSetMenuVisible] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [exerciseDetail, setExerciseDetail] = useState<{
    history: HistoryInstance[];
    lastVolume: number | null;
    lastSets: Array<{
      setNumber: number;
      reps: number;
      weight: number;
      subSetNumber?: number | null;
      setType?: 'REGULAR' | 'DROP_SET' | 'MYO_REP';
    }>;
  } | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await exercisesService.getExercise(exercise.exerciseId);
        if (cancelled) return;
        const rawHistory = data.history ?? [];
        const history: HistoryInstance[] = rawHistory
          .filter((h) => h.completedAt != null)
          .map((h) => ({
            workoutInstanceId: h.workoutInstanceId,
            volume: h.volume,
            completedAt: h.completedAt as string | Date,
            sets: h.sets ?? [],
          }));
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;
        const lastSets = lastEntry?.sets ?? [];
        const lastVolume = lastEntry?.volume ?? null;
        setExerciseDetail({
          history,
          lastVolume: lastVolume != null ? lastVolume : null,
          lastSets: Array.isArray(lastSets) ? lastSets : [],
        });
      } catch {
        if (!cancelled) setExerciseDetail({ history: [], lastVolume: null, lastSets: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [exercise.exerciseId]);

  const handleExerciseNamePress = () => {
    navigation.navigate('ExerciseDetail', { exerciseId: exercise.exerciseId });
  };

  const lastVolume = exerciseDetail?.lastVolume ?? null;

  /** Find last-workout set that matches this row (same setNumber and subSetNumber for correct placeholders). */
  const getLastSetForRow = (setNumber: number | undefined, subSetNumber: number | null | undefined) => {
    if (setNumber == null) return null;
    const lastSets = exerciseDetail?.lastSets ?? [];
    return lastSets.find((s) => {
      if (s.setNumber !== setNumber) return false;
      const sSub = s.subSetNumber ?? null;
      const rowSub = subSetNumber ?? null;
      return sSub === rowSub;
    }) ?? null;
  };

  const handleOpenHistory = () => {
    setExerciseMenuVisible(false);
    setHistoryModalVisible(true);
  };

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
        {exercise.sets.map((set, setIndex) => {
          const isSub = isSubSet(set);
          const displayNumber = formatSetNumber(set.setNumber, set.subSetNumber);
          const prevSet = setIndex > 0 ? exercise.sets[setIndex - 1] : null;
          const isFirstSubSet = isSub && prevSet && !isSubSet(prevSet);
          const nextSet = setIndex < exercise.sets.length - 1 ? exercise.sets[setIndex + 1] : null;
          const isLastSubSet = isSub && (!nextSet || !isSubSet(nextSet) || nextSet.setNumber !== set.setNumber);
          
          return (
          <View key={setIndex} style={styles.setRowContainer}>
            {isSub && (
              <View style={styles.subSetConnector}>
                {isFirstSubSet && <View style={styles.connectorTop} />}
                <View style={styles.connectorLine} />
                {isLastSubSet && <View style={styles.connectorBottom} />}
              </View>
            )}
            <AnimatedSetRowBackground 
              completed={!!set.completed} 
              style={[styles.setRow, isSub && styles.subSetRow]}
            >
            <AnimatedSetNumber 
              completed={!!set.completed} 
              setNumber={displayNumber} 
              setType={set.setType}
            />
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
                  placeholder={(getLastSetForRow(set.setNumber, set.subSetNumber)?.weight ?? set.lastSet?.weight)?.toString() || '0'}
                  placeholderTextColor="#666"
                />
                <Text style={styles.lastSetHint}>
                  Last: {(getLastSetForRow(set.setNumber, set.subSetNumber) ?? set.lastSet)?.weight ?? '-'}
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
                  placeholder={(getLastSetForRow(set.setNumber, set.subSetNumber)?.reps ?? set.lastSet?.reps)?.toString() || '0'}
                  placeholderTextColor="#666"
                />
                <Text style={styles.lastSetHint}>
                  Last: {(getLastSetForRow(set.setNumber, set.subSetNumber) ?? set.lastSet)?.reps ?? '-'}
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
          </View>
          );
        })}
      </View>

      {/* Exercise Menu */}
      <BottomDrawer
        visible={exerciseMenuVisible}
        onClose={handleExerciseMenuClose}
        title={exercise.exerciseName}
        items={[
          {
            label: 'View History',
            icon: 'history',
            onPress: handleOpenHistory,
          },
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
        title={`Set ${activeSetIndex !== null ? formatSetNumber(exercise.sets[activeSetIndex]?.setNumber, exercise.sets[activeSetIndex]?.subSetNumber) : ''}`}
        items={[
          ...(activeSetIndex !== null && !isSubSet(exercise.sets[activeSetIndex]) && onConvertSetType ? [
            {
              label: 'Convert to Drop Set',
              icon: 'swap-vert',
              onPress: () => {
                onConvertSetType(exerciseIndex, activeSetIndex, 'DROP_SET');
                handleSetMenuClose();
              },
              disabled: isWorkoutCompleted || exercise.sets[activeSetIndex].setType === 'DROP_SET',
            },
            {
              label: 'Convert to Myo Rep Set',
              icon: 'swap-vert',
              onPress: () => {
                onConvertSetType(exerciseIndex, activeSetIndex, 'MYO_REP');
                handleSetMenuClose();
              },
              disabled: isWorkoutCompleted || exercise.sets[activeSetIndex].setType === 'MYO_REP',
            },
            {
              label: 'Convert to Regular Set',
              icon: 'swap-vert',
              onPress: () => {
                onConvertSetType(exerciseIndex, activeSetIndex, 'REGULAR');
                handleSetMenuClose();
              },
              disabled: isWorkoutCompleted || exercise.sets[activeSetIndex].setType === 'REGULAR',
            },
          ] : []),
          ...(activeSetIndex !== null && !isSubSet(exercise.sets[activeSetIndex]) && onAddSubSet && (exercise.sets[activeSetIndex].setType === 'DROP_SET' || exercise.sets[activeSetIndex].setType === 'MYO_REP') ? [
            {
              label: 'Add Sub-Set',
              icon: 'add',
              onPress: () => {
                onAddSubSet(exerciseIndex, activeSetIndex);
                handleSetMenuClose();
              },
              disabled: isWorkoutCompleted,
            },
          ] : []),
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
        history={exerciseDetail?.history ?? exercise.history ?? []}
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
  setRowContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  subSetRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderLeftWidth: 3,
    borderLeftColor: '#444',
    paddingLeft: 13, // 16 - 3 for border
  },
  subSetConnector: {
    width: 20,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#444',
    minHeight: 40,
  },
  connectorTop: {
    width: 2,
    height: 8,
    backgroundColor: '#444',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  connectorBottom: {
    width: 2,
    height: 8,
    backgroundColor: '#444',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
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

