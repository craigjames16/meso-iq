import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { workoutService } from '../../services/workoutService';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ExerciseTrackingCard, type ExerciseTracking, type ExerciseSet } from '../../components/ExerciseTrackingCard';
import type { HistoryInstance } from '../../components/ExerciseHistoryModal';
import { DropdownMenu, type DropdownMenuItem } from '../../components/DropdownMenu';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { AddExerciseModal } from '../../components/plan/AddExerciseModal';
import { exercisesService } from '../../services/exercisesService';
import { ExerciseListItem } from '../../types/plan';
import { themeColors, spacing, borderRadius } from '../../theme/colors';
import { useSchedule } from '../../context/ScheduleContext';

// Categories will be extracted from backend response

type WorkoutDetailScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutDetail'>;
type WorkoutDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;

export const WorkoutDetailScreen: React.FC = () => {
  const route = useRoute<WorkoutDetailScreenRouteProp>();
  const navigation = useNavigation<WorkoutDetailScreenNavigationProp>();
  const { workoutInstanceId } = route.params;
  const { refreshSchedule } = useSchedule();

  const [workoutInstance, setWorkoutInstance] = useState<any>(null);
  const [exerciseTrackings, setExerciseTrackings] = useState<ExerciseTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [endWorkoutConfirmVisible, setEndWorkoutConfirmVisible] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseListItem[]>([]);
  const [creatingExercise, setCreatingExercise] = useState(false);

  useEffect(() => {
    fetchWorkoutData();
  }, [workoutInstanceId]);

  const fetchWorkoutData = async () => {
    try {
      setLoading(true);
      const [workoutData, exercisesData] = await Promise.all([
        workoutService.getWorkoutInstance(workoutInstanceId),
        workoutService.getExercises(),
      ]);

      setWorkoutInstance(workoutData);
      
      // Transform exercises data to ExerciseListItem[] format
      let exercisesArray: ExerciseListItem[] = [];
      
      if (exercisesData && typeof exercisesData === 'object' && Object.keys(exercisesData).length === 0) {
        setAvailableExercises([]);
      } else if (Array.isArray(exercisesData)) {
        // If it's already an array, normalize categories to uppercase
        exercisesArray = exercisesData.map((exercise: any) => ({
          ...exercise,
          category: (exercise.category || '').toUpperCase(),
          highestWeight: exercise.highestWeight || 0,
        }));
        setAvailableExercises(exercisesArray);
      } else if (typeof exercisesData === 'object' && exercisesData !== null) {
        // If it's an object with categories, flatten it
        exercisesArray = Object.entries(exercisesData).flatMap(([category, exerciseList]: [string, any]) => {
          if (!Array.isArray(exerciseList)) {
            console.warn(`Exercise list for category ${category} is not an array:`, exerciseList);
            return [];
          }
          return exerciseList.map((exercise: any) => ({
            ...exercise,
            // Prefer exercise's own category property, fall back to object key, normalize to uppercase
            category: (exercise.category || category || '').toUpperCase(),
            highestWeight: exercise.highestWeight || 0,
          }));
        });
        setAvailableExercises(exercisesArray);
      } else {
        console.warn('Unexpected exercises data format:', typeof exercisesData, exercisesData);
        setAvailableExercises([]);
      }
      
      // Get current mesocycle ID from workout data
      const currentMesocycleId = workoutData.mesocycleId || 
        workoutData.planInstanceDays?.[0]?.planInstance?.mesocycle?.id;

      // Process exercise sets
      const completedSetsMap = workoutData.exerciseSets?.reduce((acc: Record<number, any[]>, set: any) => {
        if (!acc[set.exerciseId]) {
          acc[set.exerciseId] = [];
        }
        acc[set.exerciseId].push({
          id: set.id,
          reps: set.reps,
          weight: set.weight,
          setNumber: set.setNumber,
        });
        return acc;
      }, {}) || {};

      const initialTrackings = workoutData.workoutExercises.map((workoutExercise: any) => {
        let sets: ExerciseSet[];

        if (workoutData.completedAt) {
          sets = (completedSetsMap[workoutExercise.exercise.id] || []).map((set: any) => ({
            ...set,
            completed: true,
          }));
        } else {
          const numSets = workoutExercise.lastSets?.length || 3;
          sets = Array.from({ length: numSets }, (_, index) => {
            const completedSets = completedSetsMap[workoutExercise.exercise.id] || [];
            const completedSet = completedSets.find((set: any) => set.setNumber === index + 1);
            const matchingLastSet = workoutExercise.lastSets?.find(
              (lastSet: { setNumber: number; reps: number; weight: number }) => lastSet.setNumber === index + 1
            );

            return completedSet
              ? {
                  id: completedSet.id,
                  reps: completedSet.reps,
                  weight: completedSet.weight,
                  setNumber: index + 1,
                  completed: true,
                  lastSet: matchingLastSet || null,
                }
              : {
                  reps: 0,
                  weight: 0,
                  setNumber: index + 1,
                  lastSet: matchingLastSet || null,
                };
          });
        }

        // Find the exercise history from available exercises
        const currentExercise = exercisesArray.find(
          (ex: any) => ex.id === workoutExercise.exercise.id
        );
        
        // Get all workout instances for this exercise (history)
        const history: HistoryInstance[] = currentExercise?.workoutInstances
          ?.filter((instance: any) => instance.completedAt)
          ?.map((instance: any) => ({
            workoutInstanceId: instance.workoutInstanceId,
            volume: instance.volume,
            completedAt: instance.completedAt,
            sets: instance.sets || [],
          })) || [];
        
        // Filter mesocycle-specific history (same mesocycle, but not current workout)
        const mesocycleHistory: HistoryInstance[] = currentExercise?.workoutInstances
          ?.filter((instance: any) => 
            instance.mesocycleId === currentMesocycleId && 
            instance.workoutInstanceId !== workoutData.id &&
            instance.completedAt
          )
          ?.sort((a: any, b: any) => 
            new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
          )
          ?.map((instance: any) => ({
            workoutInstanceId: instance.workoutInstanceId,
            volume: instance.volume,
            completedAt: instance.completedAt,
            sets: instance.sets || [],
          })) || [];

        return {
          exerciseId: workoutExercise.exercise.id,
          exerciseName: workoutExercise.exercise.name,
          sets,
          order: workoutExercise.order,
          history,
          mesocycleHistory,
        };
      });

      setExerciseTrackings(initialTrackings.sort((a: ExerciseTracking, b: ExerciseTracking) => a.order - b.order));
    } catch (err) {
      console.error('Error fetching workout data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workout data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    setExerciseTrackings((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.map((set, idx) =>
          field === 'weight' && !set.completed
            ? idx >= setIndex
              ? { ...set, weight: value }
              : set
            : idx === setIndex
            ? { ...set, [field]: value }
            : set
        ),
      };
      return updated;
    });
  };

  const handleSetCompletion = async (exerciseIndex: number, setIndex: number, completed: boolean) => {
    const tracking = exerciseTrackings[exerciseIndex];
    const set = tracking.sets[setIndex];

    if (!completed && set.id) {
      // Delete set - optimistic update
      setExerciseTrackings((prev: ExerciseTracking[]) => {
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
        setExerciseTrackings((prev: ExerciseTracking[]) => {
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
      // Add set - optimistic update
      const weightToUse = set.weight || set.lastSet?.weight || 0;
      const repsToUse = set.reps || set.lastSet?.reps || 0;

      // Optimistically mark as completed and loading
      setExerciseTrackings((prev) => {
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
        const response = await workoutService.addSet(
          workoutInstanceId,
          tracking.exerciseId,
          weightToUse,
          repsToUse,
          setIndex + 1
        );

        const newSetId = response[0]?.id;
        // Update with actual ID and remove loading
        setExerciseTrackings((prev) => {
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
        setExerciseTrackings((prev) => {
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
      const workoutData = await workoutService.completeWorkout(workoutInstanceId);
      setWorkoutInstance((prev: any) =>
        prev
          ? {
              ...prev,
              completedAt: workoutData.completedAt,
            }
          : null
      );
      
      // Refresh schedule to update the calendar and other components
      try {
        await refreshSchedule();
      } catch (scheduleError) {
        // Don't fail the workout completion if schedule refresh fails
        console.error('Error refreshing schedule:', scheduleError);
      }
      
      Alert.alert('Success', 'Workout completed!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Error completing workout:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete workout');
    } finally {
      setCompleting(false);
    }
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExerciseTrackings((prev) => {
      const updated = [...prev];
      const exercise = updated[exerciseIndex];
      const matchingLastSet = workoutInstance?.workoutExercises
        ?.find((we: any) => we.exercise.id === exercise.exerciseId)
        ?.lastSets?.find((ls: any) => ls.setNumber === exercise.sets.length + 1);

      updated[exerciseIndex] = {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            reps: 0,
            weight: 0,
            setNumber: exercise.sets.length + 1,
            lastSet: matchingLastSet || null,
          },
        ],
      };
      return updated;
    });
  };

  const handleRemoveExercise = async (exerciseIndex: number) => {
    const exercise = exerciseTrackings[exerciseIndex];
    
    try {
      await workoutService.removeExercise(workoutInstanceId, exercise.exerciseId);
      // Refresh workout data
      await fetchWorkoutData();
    } catch (err) {
      console.error('Error removing exercise:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove exercise');
    }
  };

  const handleReorderExercise = async (exerciseIndex: number, direction: 'up' | 'down') => {
    try {
      const exercise = exerciseTrackings[exerciseIndex];
      await workoutService.reorderExercise(workoutInstanceId, exercise.exerciseId, direction);

      setExerciseTrackings((prev) => {
        const updated = [...prev];
        const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;

        if (targetIndex >= 0 && targetIndex < updated.length) {
          [updated[exerciseIndex], updated[targetIndex]] = [updated[targetIndex], updated[exerciseIndex]];
          updated[exerciseIndex].order = exerciseIndex;
          updated[targetIndex].order = targetIndex;
        }

        return updated;
      });
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

    // Remove set from state and renumber remaining sets
    setExerciseTrackings((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets
          .filter((_, idx) => idx !== setIndex)
          .map((s, idx) => ({
            ...s,
            setNumber: idx + 1,
          })),
      };
      return updated;
    });
  };

  const addExerciseToTracking = (workoutData: any, exercise: ExerciseListItem, currentMesocycleId: number | null) => {
    // Find the newly added exercise in workout data
    const newExercise = workoutData.workoutExercises.find(
      (ex: any) => ex.exercise.id === exercise.id
    );

    if (!newExercise) {
      return null;
    }

    // Get all workout instances for this exercise (history)
    const history: HistoryInstance[] = exercise.workoutInstances
      ?.filter((instance: any) => instance.completedAt)
      ?.map((instance: any) => ({
        workoutInstanceId: instance.workoutInstanceId,
        volume: instance.volume,
        completedAt: instance.completedAt,
        sets: instance.sets || [],
      })) || [];
    
    // Filter mesocycle-specific history
    const mesocycleHistory: HistoryInstance[] = exercise.workoutInstances
      ?.filter((instance: any) => 
        instance.mesocycleId === currentMesocycleId && 
        instance.workoutInstanceId !== workoutData.id &&
        instance.completedAt
      )
      ?.sort((a: any, b: any) => 
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      )
      ?.map((instance: any) => ({
        workoutInstanceId: instance.workoutInstanceId,
        volume: instance.volume,
        completedAt: instance.completedAt,
        sets: instance.sets || [],
      })) || [];

    const numSets = newExercise.lastSets?.length || 3;
    return {
      exerciseId: newExercise.exercise.id,
      exerciseName: newExercise.exercise.name,
      order: newExercise.order,
      sets: Array.from({ length: numSets }, (_, index) => {
        const matchingLastSet = newExercise.lastSets?.find(
          (lastSet: any) => lastSet.setNumber === index + 1
        );
        return {
          reps: 0,
          weight: 0,
          setNumber: index + 1,
          lastSet: matchingLastSet || null,
        };
      }),
      history,
      mesocycleHistory,
    } as ExerciseTracking;
  };

  const handleSelectExercises = async (exercises: ExerciseListItem[]) => {
    try {
      const exerciseIds = exercises.map((ex) => ex.id);
      const workoutData = await workoutService.addExercise(workoutInstanceId, exerciseIds);
      setWorkoutInstance(workoutData);

      // Get current mesocycle ID
      const currentMesocycleId = workoutData.mesocycleId || 
        workoutData.planInstanceDays?.[0]?.planInstance?.mesocycle?.id;

      // Process all newly added exercises
      const newExerciseTrackings: ExerciseTracking[] = exercises
        .map((exercise) => addExerciseToTracking(workoutData, exercise, currentMesocycleId))
        .filter((tracking): tracking is ExerciseTracking => tracking !== null);

      setExerciseTrackings((prev) => {
        const updated = [...prev, ...newExerciseTrackings];
        return updated.sort((a, b) => a.order - b.order);
      });

      setAddExerciseModalVisible(false);
    } catch (err: any) {
      console.error('Error adding exercises:', err);
      
      // Extract error message - check multiple possible locations
      const errorMessage = err?.message || err?.error || err?.errorData?.message || 'Failed to add exercises';
      
      Alert.alert('Error', errorMessage);
    }
  };

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


  if (loading) {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.workoutName}>{workoutInstance.workout?.name || 'Workout'}</Text>
            <Text style={styles.progressText}>
              {completedSets}/{totalSets} sets completed
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            disabled={isWorkoutCompleted}
            style={[styles.addExerciseButton, isWorkoutCompleted && styles.addExerciseButtonDisabled]}
          >
            <MaterialIcons name="more-vert" size={24} color={isWorkoutCompleted ? "#666" : "#999"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
              onPress={() => setAddExerciseModalVisible(true)}
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
              onUpdateSet={handleUpdateSet}
              onSetCompletion={handleSetCompletion}
              onAddSet={handleAddSet}
              onRemoveExercise={handleRemoveExercise}
              onReorderExercise={handleReorderExercise}
              onRemoveSet={handleRemoveSet}
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
            onPress: () => setAddExerciseModalVisible(true),
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#999',
  },
  addExerciseButton: {
    padding: 4,
    marginLeft: 12,
  },
  addExerciseButtonDisabled: {
    opacity: 0.5,
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

