import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { workoutService } from '../../services/workoutService';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ExerciseTrackingCard, type ExerciseTracking, type ExerciseSet } from '../../components/ExerciseTrackingCard';
import type { HistoryInstance } from '../../components/ExerciseHistoryModal';
import { BottomDrawer } from '../../components/BottomDrawer';
import { DropdownMenu, type DropdownMenuItem } from '../../components/DropdownMenu';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { themeColors, spacing, borderRadius } from '../../theme/colors';

// Categories will be extracted from backend response

type WorkoutDetailScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutDetail'>;
type WorkoutDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;

export const WorkoutDetailScreen: React.FC = () => {
  const route = useRoute<WorkoutDetailScreenRouteProp>();
  const navigation = useNavigation<WorkoutDetailScreenNavigationProp>();
  const { workoutInstanceId } = route.params;

  const [workoutInstance, setWorkoutInstance] = useState<any>(null);
  const [exerciseTrackings, setExerciseTrackings] = useState<ExerciseTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [endWorkoutConfirmVisible, setEndWorkoutConfirmVisible] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>(['ALL']);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

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
      
      let exercisesArray: any[] = [];
      
      // Handle different response formats
      let categoriesFromBackend: string[] = [];
      
      // Check if response is empty object
      if (exercisesData && typeof exercisesData === 'object' && Object.keys(exercisesData).length === 0) {
        setAvailableExercises([]);
        setAvailableCategories(['ALL']);
      } else if (Array.isArray(exercisesData)) {
        // If it's already an array, normalize categories to uppercase
        exercisesArray = exercisesData.map((exercise: any) => ({
          ...exercise,
          category: (exercise.category || '').toUpperCase(),
        }));
        categoriesFromBackend = [...new Set(exercisesArray.map((ex: any) => ex.category).filter(Boolean))].sort();
        setAvailableExercises(exercisesArray);
        setAvailableCategories(['ALL', ...categoriesFromBackend]);
      } else if (typeof exercisesData === 'object' && exercisesData !== null) {
        // If it's an object with categories, flatten it and extract categories from keys
        categoriesFromBackend = Object.keys(exercisesData)
          .map(cat => cat.toUpperCase())
          .filter(Boolean)
          .sort();
        
        exercisesArray = Object.entries(exercisesData).flatMap(([category, exerciseList]: [string, any]) => {
          if (!Array.isArray(exerciseList)) {
            console.warn(`Exercise list for category ${category} is not an array:`, exerciseList);
            return [];
          }
          return exerciseList.map((exercise: any) => ({
            ...exercise,
            // Prefer exercise's own category property, fall back to object key, normalize to uppercase
            category: (exercise.category || category || '').toUpperCase(),
          }));
        });
        
        setAvailableExercises(exercisesArray);
        // Set available categories from backend, with 'ALL' as first option
        setAvailableCategories(['ALL', ...categoriesFromBackend]);
      } else {
        console.warn('Unexpected exercises data format:', typeof exercisesData, exercisesData);
        setAvailableExercises([]);
        setAvailableCategories(['ALL']);
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
    try {
      const tracking = exerciseTrackings[exerciseIndex];
      const set = tracking.sets[setIndex];

      if (!completed && set.id) {
        // Delete set
        await workoutService.deleteSet(workoutInstanceId, [set.id]);
      setExerciseTrackings((prev: ExerciseTracking[]) => {
        const updated = [...prev];
        updated[exerciseIndex].sets[setIndex] = {
          ...updated[exerciseIndex].sets[setIndex],
          id: undefined,
          completed: false,
        };
        return updated;
      });
      } else if (completed) {
        // Add set
        const weightToUse = set.weight || set.lastSet?.weight || 0;
        const repsToUse = set.reps || set.lastSet?.reps || 0;

        const response = await workoutService.addSet(
          workoutInstanceId,
          tracking.exerciseId,
          weightToUse,
          repsToUse,
          setIndex + 1
        );

        const newSetId = response[0]?.id;
        setExerciseTrackings((prev) => {
          const updated = [...prev];
          updated[exerciseIndex].sets[setIndex] = {
            ...updated[exerciseIndex].sets[setIndex],
            id: newSetId,
            completed: true,
            weight: weightToUse,
            reps: repsToUse,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Error in handleSetCompletion:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update set');
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

  const handleAddExercise = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please select at least one exercise');
      return;
    }

    try {
      const exerciseIds = selectedExercises.map((id) => parseInt(id));
      const workoutData = await workoutService.addExercise(workoutInstanceId, exerciseIds);
      setWorkoutInstance(workoutData);

      // Get current mesocycle ID
      const currentMesocycleId = workoutData.mesocycleId || 
        workoutData.planInstanceDays?.[0]?.planInstance?.mesocycle?.id;

      // Process all newly added exercises
      const newExerciseTrackings: ExerciseTracking[] = exerciseIds
        .map((exerciseId) => {
          const newExercise = workoutData.workoutExercises.find(
            (ex: any) => ex.exercise.id === exerciseId
          );

          if (!newExercise) {
            return null;
          }

          // Find the exercise to get history data
          const currentExercise = availableExercises.find(
            (ex: any) => ex.id === exerciseId
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
          
          // Filter mesocycle-specific history
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
        })
        .filter((tracking): tracking is ExerciseTracking => tracking !== null);

      setExerciseTrackings((prev) => {
        const updated = [...prev, ...newExerciseTrackings];
        return updated.sort((a, b) => a.order - b.order);
      });

      setSelectedExercises([]);
      setSelectedCategory('ALL');
      setAddExerciseModalVisible(false);
    } catch (err: any) {
      console.error('Error adding exercise:', err);
      
      // Extract error message - check multiple possible locations
      const errorMessage = err?.message || err?.error || err?.errorData?.message || 'Failed to add exercise';
      
      // Check if it's the specific "already added" error (409 status or message contains "already")
      const isAlreadyAddedError = err?.status === 409 || 
                                  errorMessage.toLowerCase().includes('already') || 
                                  errorMessage.toLowerCase().includes('already in this workout');
      
      if (isAlreadyAddedError) {
        Alert.alert('Exercise Already Added', errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const getCategories = () => {
    // Use categories from backend response
    console.log('Available categories from state:', availableCategories);
    return availableCategories;
  };

  const formatCategoryName = (category: string) => {
    if (category === 'ALL') return 'All Categories';
    return category.charAt(0) + category.slice(1).toLowerCase();
  };

  const getFilteredExercises = () => {
    let filtered;
    if (selectedCategory === 'ALL') {
      filtered = availableExercises;
    } else {
      // Case-insensitive category matching
      filtered = availableExercises.filter((ex) => {
        const exCategory = ex.category ? ex.category.toUpperCase() : '';
        const selectedCat = selectedCategory.toUpperCase();
        const matches = exCategory === selectedCat;
        if (!matches && exCategory) {
          console.log(`Exercise "${ex.name}" category "${exCategory}" doesn't match selected "${selectedCat}"`);
        }
        return matches;
      });
    }
    console.log('Filtered exercises for category', selectedCategory, ':', filtered.length);
    console.log('Available exercises total:', availableExercises.length);
    console.log('Selected category:', selectedCategory);
    console.log('Available categories:', availableCategories);
    if (filtered.length === 0 && availableExercises.length > 0) {
      console.log('Sample exercise categories:', availableExercises.slice(0, 5).map(ex => ({ name: ex.name, category: ex.category })));
    }
    return filtered;
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
              key={exercise.exerciseId}
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
      <BottomDrawer
        visible={addExerciseModalVisible}
        onClose={() => {
          setAddExerciseModalVisible(false);
          setSelectedExercises([]);
          setSelectedCategory('ALL');
        }}
        title="Add Exercise"
        height="80%"
      >
        <View style={styles.addExerciseModalContent}>
          {/* Category Pills */}
          <View style={styles.categoryPillsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsScrollContent}
            >
              {getCategories().map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    selectedCategory === cat && styles.categoryPillActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setSelectedExercises([]); // Reset exercise selection when category changes
                  }}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      selectedCategory === cat && styles.categoryPillTextActive,
                    ]}
                  >
                    {formatCategoryName(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Exercise List */}
          <FlatList
            data={getFilteredExercises()}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const exerciseIdStr = item.id.toString();
              const isSelected = selectedExercises.includes(exerciseIdStr);
              return (
                <TouchableOpacity
                  style={[
                    styles.exerciseListItem,
                    isSelected && styles.exerciseListItemSelected,
                  ]}
                  onPress={() => {
                    if (!isWorkoutCompleted) {
                      setSelectedExercises((prev) => {
                        if (prev.includes(exerciseIdStr)) {
                          return prev.filter((id) => id !== exerciseIdStr);
                        } else {
                          return [...prev, exerciseIdStr];
                        }
                      });
                    }
                  }}
                  disabled={isWorkoutCompleted}
                >
                  <Text
                    style={[
                      styles.exerciseListItemText,
                      isSelected && styles.exerciseListItemTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={themeColors.accent.success}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.exerciseListContent}
            ListEmptyComponent={
              <View style={styles.emptyExerciseList}>
                <Text style={styles.emptyExerciseListText}>
                  No exercises available in {formatCategoryName(selectedCategory).toLowerCase()}
                </Text>
              </View>
            }
          />

          {/* Add Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={[
                styles.addExerciseButtonModal,
                (selectedExercises.length === 0 || isWorkoutCompleted) && styles.addExerciseButtonModalDisabled,
              ]}
              onPress={handleAddExercise}
              disabled={selectedExercises.length === 0 || isWorkoutCompleted}
            >
              <Text style={styles.addExerciseButtonText}>
                {selectedExercises.length === 0
                  ? 'Add Exercise'
                  : `Add ${selectedExercises.length} Exercise${selectedExercises.length > 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomDrawer>

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
  addExerciseModalContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  categoryPillsContainer: {
    marginBottom: spacing.md,
  },
  categoryPillsScrollContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginRight: spacing.sm,
  },
  categoryPillActive: {
    backgroundColor: themeColors.primary.main,
    borderColor: themeColors.primary.main,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text.secondary,
  },
  categoryPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  exerciseListContent: {
    paddingBottom: spacing.md,
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  exerciseListItemSelected: {
    backgroundColor: themeColors.background.elevated,
    borderColor: themeColors.primary.main,
    borderWidth: 2,
  },
  exerciseListItemText: {
    fontSize: 16,
    color: themeColors.text.primary,
    flex: 1,
  },
  exerciseListItemTextSelected: {
    color: themeColors.text.primary,
    fontWeight: '600',
  },
  emptyExerciseList: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyExerciseListText: {
    color: themeColors.text.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  addButtonContainer: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border.default,
    backgroundColor: themeColors.background.secondary,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  addExerciseButtonModal: {
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  addExerciseButtonModalDisabled: {
    backgroundColor: themeColors.background.surface,
    opacity: 0.5,
  },
  addExerciseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

