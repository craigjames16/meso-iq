import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { workoutService } from '../../services/workoutService';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ExerciseTrackingCard, type ExerciseTracking } from '../../components/ExerciseTrackingCard';
import { DropdownMenu } from '../../components/DropdownMenu';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { AddExerciseModal } from '../../components/plan/AddExerciseModal';
import { exercisesService } from '../../services/exercisesService';
import type { ExerciseDetailData } from '../../utils/workoutTrackingResolver';
import { ExerciseListItem } from '../../types/plan';
import { themeColors, spacing, borderRadius } from '../../theme/colors';
import { useSchedule } from '../../context/ScheduleContext';
import { useWorkoutInstance } from '../../context/WorkoutInstanceContext';

// Categories will be extracted from backend response

type WorkoutDetailScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutDetail'>;
type WorkoutDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;

const SCROLL_THRESHOLD = 60;
const MESOCYCLE_NAME_MAX_LENGTH = 18;

const EMPTY_EXERCISE_DETAIL: ExerciseDetailData = {
  history: [],
  lastVolume: null,
  lastSets: [],
};

export const WorkoutDetailScreen: React.FC = () => {
  const route = useRoute<WorkoutDetailScreenRouteProp>();
  const navigation = useNavigation<WorkoutDetailScreenNavigationProp>();
  const { workoutInstanceId } = route.params;
  const { refreshSchedule } = useSchedule();
  const {
    workoutInstance,
    loading,
    error,
    loadWorkoutData,
    trackingsMap,
    exerciseDetailsMap,
    trackingsLoading,
    updateExerciseTrackings,
    clearWorkoutTrackings,
    syncWorkoutInstance,
  } = useWorkoutInstance();

  const exerciseTrackings = trackingsMap[workoutInstanceId] ?? [];
  const [completing, setCompleting] = useState(false);
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [endWorkoutConfirmVisible, setEndWorkoutConfirmVisible] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseListItem[]>([]);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadWorkoutData(workoutInstanceId);
  }, [workoutInstanceId, loadWorkoutData]);

  // Set nav header title (Week X - Day Y) and menu button
  useEffect(() => {
    if (!workoutInstance || workoutInstance.id !== workoutInstanceId) return;
    const planDay = workoutInstance.planInstanceDays?.[0]?.planDay;
    const planInstance = workoutInstance.planInstanceDays?.[0]?.planInstance;
    const hasPlanContext = planDay != null && planInstance != null;
    const week = planInstance?.iterationNumber;
    const day = planDay?.dayNumber;
    const title =
      hasPlanContext && typeof week === 'number' && typeof day === 'number'
        ? `Week ${week} - Day ${day}`
        : workoutInstance.workout?.name || 'Workout';
    const isWorkoutCompleted = !!workoutInstance.completedAt;
    navigation.setOptions({
      title,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          disabled={isWorkoutCompleted}
          style={{ padding: 8 }}
        >
          <MaterialIcons
            name="more-vert"
            size={24}
            color={isWorkoutCompleted ? '#666' : '#999'}
          />
        </TouchableOpacity>
      ),
    });
  }, [workoutInstance, workoutInstanceId, navigation]);

  const fetchExercisesForModal = useCallback(async () => {
    try {
      const exercisesData = await workoutService.getExercises();
      let exercisesArray: ExerciseListItem[] = [];
      if (exercisesData && typeof exercisesData === 'object' && Object.keys(exercisesData).length === 0) {
        setAvailableExercises([]);
        return;
      }
      if (Array.isArray(exercisesData)) {
        exercisesArray = exercisesData.map((exercise: any) => ({
          ...exercise,
          category: (exercise.category || '').toUpperCase(),
          highestWeight: exercise.highestWeight || 0,
        }));
      } else if (typeof exercisesData === 'object' && exercisesData !== null) {
        exercisesArray = Object.entries(exercisesData).flatMap(([category, exerciseList]: [string, any]) => {
          if (!Array.isArray(exerciseList)) return [];
          return exerciseList.map((exercise: any) => ({
            ...exercise,
            category: (exercise.category || category || '').toUpperCase(),
            highestWeight: exercise.highestWeight || 0,
          }));
        });
      }
      setAvailableExercises(exercisesArray);
    } catch (err) {
      console.error('Error fetching exercises:', err);
      setAvailableExercises([]);
    }
  }, []);

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    updateExerciseTrackings(workoutInstanceId, (prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.map((set, idx) =>
          idx === setIndex ? { ...set, [field]: value } : set
        ),
      };
      return updated;
    });
  };

  const handleSetCompletion = async (
    exerciseIndex: number,
    setIndex: number,
    completed: boolean,
    recommendedReps?: number
  ) => {
    const tracking = exerciseTrackings[exerciseIndex];
    const set = tracking.sets[setIndex];

    if (!completed && set.id) {
      // Delete set - optimistic update
      updateExerciseTrackings(workoutInstanceId, (prev: ExerciseTracking[]) => {
        const updated = [...prev];
        updated[exerciseIndex].sets[setIndex] = {
          ...updated[exerciseIndex].sets[setIndex],
          id: undefined,
          completed: false,
          loading: false,
        };
        return updated;
      });

      try {
        await workoutService.deleteSet(workoutInstanceId, [set.id]);
      } catch (err) {
        console.error('Error in handleSetCompletion:', err);
        // Revert on error
        updateExerciseTrackings(workoutInstanceId, (prev: ExerciseTracking[]) => {
          const updated = [...prev];
          updated[exerciseIndex].sets[setIndex] = {
            ...updated[exerciseIndex].sets[setIndex],
            id: set.id,
            completed: true,
            loading: false,
          };
          return updated;
        });
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete set');
      }
    } else if (completed) {
      // Add set - optimistic update (use recommended reps when user left reps empty)
      const weightToUse = set.weight || set.lastSet?.weight || 0;
      const repsToUse = set.reps || (recommendedReps ?? set.lastSet?.reps ?? 0);

      // Optimistically mark as completed and loading
      updateExerciseTrackings(workoutInstanceId, (prev) => {
        const updated = [...prev];
        updated[exerciseIndex].sets[setIndex] = {
          ...updated[exerciseIndex].sets[setIndex],
          completed: true,
          loading: true,
          weight: weightToUse,
          reps: repsToUse,
        };
        return updated;
      });

      try {
        const set = tracking.sets[setIndex];
        const response = await workoutService.addSet(
          workoutInstanceId,
          tracking.exerciseId,
          weightToUse,
          repsToUse,
          set.setNumber || setIndex + 1,
          set.subSetNumber ?? null,
          set.setType || 'REGULAR'
        );

        const newSetId = response[0]?.id;
        // Update with actual ID and remove loading
        updateExerciseTrackings(workoutInstanceId, (prev) => {
          const updated = [...prev];
          updated[exerciseIndex].sets[setIndex] = {
            ...updated[exerciseIndex].sets[setIndex],
            id: newSetId,
            completed: true,
            loading: false,
          };
          return updated;
        });
      } catch (err) {
        console.error('Error in handleSetCompletion:', err);
        // Revert on error
        updateExerciseTrackings(workoutInstanceId, (prev) => {
          const updated = [...prev];
          updated[exerciseIndex].sets[setIndex] = {
            ...updated[exerciseIndex].sets[setIndex],
            completed: false,
            loading: false,
            id: undefined,
          };
          return updated;
        });
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update set');
      }
    }
  };

  const handleCompleteWorkout = async () => {
    try {
      setCompleting(true);
      setEndWorkoutConfirmVisible(false);
      await workoutService.completeWorkout(workoutInstanceId);
      clearWorkoutTrackings(workoutInstanceId);
      try {
        await refreshSchedule();
      } catch (scheduleError) {
        console.error('Error refreshing schedule:', scheduleError);
      }
      navigation.replace('WorkoutComplete', { workoutInstanceId });
    } catch (err) {
      console.error('Error completing workout:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete workout');
    } finally {
      setCompleting(false);
    }
  };

  const handleAddSet = (exerciseIndex: number) => {
    updateExerciseTrackings(workoutInstanceId, (prev) => {
      const updated = [...prev];
      const exercise = updated[exerciseIndex];
      const mainSets = exercise.sets.filter(s => s.subSetNumber === null || s.subSetNumber === undefined);
      const nextSetNumber = mainSets.length > 0
        ? Math.max(...mainSets.map(s => s.setNumber || 0)) + 1
        : exercise.sets.length + 1;
      updated[exerciseIndex] = {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            reps: 0,
            weight: 0,
            setNumber: nextSetNumber,
            subSetNumber: null,
            setType: 'REGULAR',
            completed: false,
          },
        ],
      };
      return updated;
    });
  };

  const handleRemoveExercise = async (exerciseIndex: number) => {
    const exercise = exerciseTrackings[exerciseIndex];
    try {
      const updatedInstance = await workoutService.removeExercise(workoutInstanceId, exercise.exerciseId);
      await syncWorkoutInstance(workoutInstanceId, updatedInstance);
    } catch (err) {
      console.error('Error removing exercise:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove exercise');
    }
  };

  const handleReorderExercise = async (exerciseIndex: number, direction: 'up' | 'down') => {
    try {
      const exercise = exerciseTrackings[exerciseIndex];
      await workoutService.reorderExercise(workoutInstanceId, exercise.exerciseId, direction);
      const updatedInstance = await workoutService.getWorkoutInstance(workoutInstanceId);
      await syncWorkoutInstance(workoutInstanceId, updatedInstance);
    } catch (err) {
      console.error('Error reordering exercise:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to reorder exercise');
    }
  };

  const handleRemoveSet = async (exerciseIndex: number, setIndex: number) => {
    const tracking = exerciseTrackings[exerciseIndex];
    const set = tracking.sets[setIndex];

    // If set is completed (has an id), delete it via API
    if (set.id) {
      try {
        await workoutService.deleteSet(workoutInstanceId, [set.id]);
      } catch (err) {
        console.error('Error deleting set:', err);
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete set');
        return;
      }
    }

    // Remove set from state
    updateExerciseTrackings(workoutInstanceId, (prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.filter((_, idx) => idx !== setIndex),
      };
      return updated;
    });
  };

  const handleConvertSetType = async (
    exerciseIndex: number,
    setIndex: number,
    setType: 'REGULAR' | 'DROP_SET' | 'MYO_REP'
  ) => {
    const tracking = exerciseTrackings[exerciseIndex];
    const set = tracking.sets[setIndex];

    // For incomplete sets, update local state and add blank sub-set if needed
    if (!set.id) {
      updateExerciseTrackings(workoutInstanceId, (prev) => {
        const updated = [...prev];
        const currentSet = updated[exerciseIndex].sets[setIndex];
        
        // Update the set type
        updated[exerciseIndex].sets[setIndex] = {
          ...currentSet,
          setType,
        };

        // If converting to DROP_SET or MYO_REP, add a blank sub-set
        if ((setType === 'DROP_SET' || setType === 'MYO_REP') && currentSet.setNumber) {
          // Check if there are already sub-sets for this set number
          const existingSubSets = updated[exerciseIndex].sets.filter(
            (s) => s.setNumber === currentSet.setNumber && 
                   s.subSetNumber !== null && 
                   s.subSetNumber !== undefined
          );
          
          // Only add if no sub-sets exist yet
          if (existingSubSets.length === 0) {
            // Find the insertion point (after the parent set and any existing sub-sets)
            let insertIndex = setIndex + 1;
            while (
              insertIndex < updated[exerciseIndex].sets.length &&
              updated[exerciseIndex].sets[insertIndex].setNumber === currentSet.setNumber &&
              updated[exerciseIndex].sets[insertIndex].subSetNumber !== null &&
              updated[exerciseIndex].sets[insertIndex].subSetNumber !== undefined
            ) {
              insertIndex++;
            }

            // Add blank sub-set
            updated[exerciseIndex].sets.splice(insertIndex, 0, {
              reps: 0,
              weight: 0,
              setNumber: currentSet.setNumber,
              subSetNumber: 1,
              setType: setType,
              completed: false,
            });
          }
        } else if (setType === 'REGULAR') {
          // If converting to REGULAR, remove any existing sub-sets for this set number
          updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter(
            (s, idx) => !(
              s.setNumber === currentSet.setNumber && 
              s.subSetNumber !== null && 
              s.subSetNumber !== undefined &&
              idx !== setIndex
            )
          );
        }

        return updated;
      });
      return;
    }

    // For completed sets, update via API
    try {
      await workoutService.convertSetType(workoutInstanceId, set.id, setType);
      
      // Update local state
      updateExerciseTrackings(workoutInstanceId, (prev) => {
        const updated = [...prev];
        updated[exerciseIndex].sets[setIndex] = {
          ...updated[exerciseIndex].sets[setIndex],
          setType,
        };
        return updated;
      });
    } catch (err) {
      console.error('Error converting set type:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to convert set type');
    }
  };

  const handleAddSubSet = (exerciseIndex: number, parentSetIndex: number) => {
    const tracking = exerciseTrackings[exerciseIndex];
    const parentSet = tracking.sets[parentSetIndex];

    if (!parentSet.setNumber) {
      Alert.alert('Error', 'Invalid parent set');
      return;
    }

    // Check if parent set is a DROP_SET or MYO_REP
    if (parentSet.setType !== 'DROP_SET' && parentSet.setType !== 'MYO_REP') {
      Alert.alert('Error', 'Parent set must be a Drop Set or Myo Rep Set');
      return;
    }

    // Find existing sub-sets for this parent set number
    const existingSubSets = tracking.sets.filter(
      (s) => s.setNumber === parentSet.setNumber && 
             s.subSetNumber !== null && 
             s.subSetNumber !== undefined
    );

    const maxSubSetNumber = existingSubSets.length > 0
      ? Math.max(...existingSubSets.map((s) => s.subSetNumber || 0))
      : 0;

    const nextSubSetNumber = maxSubSetNumber + 1;

    const weightToUse = parentSet.weight || 0;
    const repsToUse = parentSet.reps || 0;

    // Find the index where to insert the sub-set (after parent and any existing sub-sets)
    let insertIndex = parentSetIndex + 1;
    while (
      insertIndex < tracking.sets.length &&
      tracking.sets[insertIndex].setNumber === parentSet.setNumber &&
      tracking.sets[insertIndex].subSetNumber !== null &&
      tracking.sets[insertIndex].subSetNumber !== undefined
    ) {
      insertIndex++;
    }

    // Add blank sub-set to state (not completed)
    updateExerciseTrackings(workoutInstanceId, (prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: [
          ...updated[exerciseIndex].sets.slice(0, insertIndex),
          {
            reps: repsToUse,
            weight: weightToUse,
            setNumber: parentSet.setNumber,
            subSetNumber: nextSubSetNumber,
            setType: parentSet.setType || 'DROP_SET',
            completed: false,
          },
          ...updated[exerciseIndex].sets.slice(insertIndex),
        ],
      };
      return updated;
    });
  };

  const handleSelectExercises = async (exercises: ExerciseListItem[]) => {
    try {
      const exerciseIds = exercises.map((ex) => ex.id);
      const updatedInstance = await workoutService.addExercise(workoutInstanceId, exerciseIds);
      await syncWorkoutInstance(workoutInstanceId, updatedInstance);
      setAddExerciseModalVisible(false);
    } catch (err: any) {
      console.error('Error adding exercises:', err);
      const errorMessage = err?.message || err?.error || err?.errorData?.message || 'Failed to add exercises';
      Alert.alert('Error', errorMessage);
    }
  };

  const openAddExerciseModal = useCallback(() => {
    fetchExercisesForModal();
    setAddExerciseModalVisible(true);
  }, [fetchExercisesForModal]);

  const handleCreateExercise = async (name: string, category: string) => {
    try {
      setCreatingExercise(true);
      const newExercise = await exercisesService.createExercise({ name, category });
      
      // Refresh exercises list
      const exercisesData = await workoutService.getExercises();
      
      // Transform exercises data to ExerciseListItem[] format
      let exercisesArray: ExerciseListItem[] = [];
      
      if (Array.isArray(exercisesData)) {
        exercisesArray = exercisesData.map((exercise: any) => ({
          ...exercise,
          category: (exercise.category || '').toUpperCase(),
          highestWeight: exercise.highestWeight || 0,
        }));
      } else if (typeof exercisesData === 'object' && exercisesData !== null) {
        exercisesArray = Object.entries(exercisesData).flatMap(([category, exerciseList]: [string, any]) => {
          if (!Array.isArray(exerciseList)) {
            return [];
          }
          return exerciseList.map((exercise: any) => ({
            ...exercise,
            category: (exercise.category || category || '').toUpperCase(),
            highestWeight: exercise.highestWeight || 0,
          }));
        });
      }
      
      setAvailableExercises(exercisesArray);
      
      // Auto-select the newly created exercise
      const exerciseToSelect = exercisesArray.find((ex) => ex.id === newExercise.id);
      if (exerciseToSelect) {
        await handleSelectExercises([exerciseToSelect]);
      }
    } catch (err: any) {
      console.error('Failed to create exercise', err);
      Alert.alert('Error', err.message || 'Failed to create exercise');
      throw err;
    } finally {
      setCreatingExercise(false);
    }
  };


  if (loading || trackingsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error || !workoutInstance) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || 'Workout not found'}</Text>
      </View>
    );
  }

  const completedSets = exerciseTrackings.reduce(
    (total, exercise) => total + (exercise.sets || []).filter((set) => set.completed).length,
    0
  );
  const totalSets = exerciseTrackings.reduce((total, exercise) => total + (exercise.sets || []).length, 0);
  const isWorkoutCompleted = !!workoutInstance.completedAt;
  const allSetsCompleted = exerciseTrackings.every((tracking) =>
    tracking.sets?.every((set) => set.completed === true)
  );

  const planDay = workoutInstance.planInstanceDays?.[0]?.planDay;
  const planInstance = workoutInstance.planInstanceDays?.[0]?.planInstance;
  const hasPlanContext = planDay != null && planInstance != null;
  const mesocycleName = planInstance?.mesocycle?.name;
  const rir = planInstance?.rir;

  const detailsOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const detailsMaxHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [120, 0],
    extrapolate: 'clamp',
  });
  const headerPaddingTop = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [16, 0],
    extrapolate: 'clamp',
  });
  const headerPaddingBottom = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [12, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Collapsible details: mesocycle subtitle + RIR & sets chips */}
      <Animated.View style={[styles.header, { paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom }]}>
        <Animated.View style={[styles.headerDetails, { opacity: detailsOpacity, maxHeight: detailsMaxHeight, overflow: 'hidden' }]}>
          <View style={styles.headerRow}>
            {mesocycleName ? (
              <Text style={styles.mesocycleSubtitle} numberOfLines={1}>
                {mesocycleName.length > MESOCYCLE_NAME_MAX_LENGTH
                  ? `${mesocycleName.slice(0, MESOCYCLE_NAME_MAX_LENGTH)}…`
                  : mesocycleName}
              </Text>
            ) : <View style={styles.mesocycleSubtitlePlaceholder} />}
            <View style={styles.headerChips}>
              {hasPlanContext && rir != null && (
                <View style={styles.headerMetaChip}>
                  <Text style={styles.headerMetaChipText}>RIR {rir}</Text>
                </View>
              )}
              <View style={styles.headerMetaChip}>
                <Text style={styles.headerMetaChipText}>{completedSets}/{totalSets} sets</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Exercise List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {exerciseTrackings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises in this workout</Text>
            <Text style={styles.emptySubtext}>
              Add your first exercise to begin tracking
            </Text>
            <TouchableOpacity
              style={[
                styles.addExerciseEmptyButton,
                isWorkoutCompleted && styles.addExerciseEmptyButtonDisabled
              ]}
              onPress={openAddExerciseModal}
              disabled={isWorkoutCompleted}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addExerciseEmptyButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ) : (
          exerciseTrackings.map((exercise, exerciseIndex) => (
            <ExerciseTrackingCard
              key={`${exercise.exerciseId}-${exerciseIndex}`}
              exercise={exercise}
              exerciseIndex={exerciseIndex}
              workoutInstanceId={workoutInstanceId}
              isWorkoutCompleted={isWorkoutCompleted}
              totalExercises={exerciseTrackings.length}
              workoutInstance={workoutInstance}
              exerciseDetail={
                exerciseDetailsMap[exercise.exerciseId] ?? EMPTY_EXERCISE_DETAIL
              }
              onUpdateSet={handleUpdateSet}
              onSetCompletion={handleSetCompletion}
              onAddSet={handleAddSet}
              onRemoveExercise={handleRemoveExercise}
              onReorderExercise={handleReorderExercise}
              onRemoveSet={handleRemoveSet}
              onConvertSetType={handleConvertSetType}
              onAddSubSet={handleAddSubSet}
            />
          ))
        )}
      </ScrollView>

      {/* Complete Workout Button */}
      {exerciseTrackings.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.completeWorkoutButton,
              (!allSetsCompleted || isWorkoutCompleted || completing) && styles.completeWorkoutButtonDisabled,
            ]}
            onPress={handleCompleteWorkout}
            disabled={!allSetsCompleted || isWorkoutCompleted || completing}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.completeWorkoutText}>
                  {isWorkoutCompleted ? 'Completed' : `Complete Workout (${completedSets}/${totalSets})`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Dropdown */}
      <DropdownMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={[
          {
            label: 'Add Exercise',
            icon: 'add',
            onPress: openAddExerciseModal,
            disabled: isWorkoutCompleted,
          },
          {
            label: 'End Workout',
            icon: 'check-circle',
            onPress: () => {
              setMenuVisible(false);
              setEndWorkoutConfirmVisible(true);
            },
            disabled: isWorkoutCompleted || completing,
          },
        ]}
      />

      {/* End Workout Confirmation Modal */}
      <ConfirmationModal
        visible={endWorkoutConfirmVisible}
        onClose={() => setEndWorkoutConfirmVisible(false)}
        onConfirm={handleCompleteWorkout}
        title="End Workout"
        message={
          allSetsCompleted
            ? 'Are you sure you want to end this workout?'
            : `You have ${totalSets - completedSets} incomplete set${totalSets - completedSets > 1 ? 's' : ''}. Are you sure you want to end this workout?`
        }
        confirmText="End Workout"
        cancelText="Cancel"
        confirmButtonStyle="default"
        loading={completing}
      />

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={addExerciseModalVisible}
        onClose={() => {
          setAddExerciseModalVisible(false);
        }}
        exercises={availableExercises}
        onSelectExercises={handleSelectExercises}
        onCreateExercise={handleCreateExercise}
        creating={creatingExercise}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerDetails: {
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    paddingRight: 12,
  },
  mesocycleSubtitle: {
    flex: 1,
    fontSize: 17,
    color: '#999',
    marginRight: 8,
    paddingLeft: 12,
  },
  mesocycleSubtitlePlaceholder: {
    flex: 1,
  },
  headerChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerMetaChip: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerMetaChipText: {
    fontSize: 13,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  addExerciseEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  addExerciseEmptyButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  addExerciseEmptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  completeWorkoutButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  completeWorkoutButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  completeWorkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

