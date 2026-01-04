import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { workoutService } from '../../services/workoutService';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ExerciseTrackingCard, type ExerciseTracking, type ExerciseSet } from '../../components/ExerciseTrackingCard';
import type { HistoryInstance } from '../../components/ExerciseHistoryModal';

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
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);

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

      // Process exercises data - it comes grouped by category with workoutInstances (history)
      console.log('Exercises data received:', JSON.stringify(exercisesData, null, 2));
      console.log('Exercises data type:', typeof exercisesData, Array.isArray(exercisesData));
      
      let exercisesArray: any[] = [];
      
      // Handle different response formats
      if (Array.isArray(exercisesData)) {
        // If it's already an array, use it directly
        exercisesArray = exercisesData;
      } else if (typeof exercisesData === 'object' && exercisesData !== null) {
        // If it's an object with categories, flatten it
        exercisesArray = Object.entries(exercisesData).flatMap(([category, exerciseList]: [string, any]) => {
          if (!Array.isArray(exerciseList)) {
            console.warn(`Exercise list for category ${category} is not an array:`, exerciseList);
            return [];
          }
          return exerciseList.map((exercise: any) => ({
            ...exercise,
            category: category,
          }));
        });
      }
      
      console.log('Processed exercises array:', exercisesArray.length, 'exercises');
      console.log('Sample exercise:', exercisesArray[0]);
      setAvailableExercises(exercisesArray);
      
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
          sets = completedSetsMap[workoutExercise.exercise.id] || [];
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
    if (!selectedExercise) {
      Alert.alert('Error', 'Please select an exercise');
      return;
    }

    try {
      const workoutData = await workoutService.addExercise(workoutInstanceId, parseInt(selectedExercise));
      setWorkoutInstance(workoutData);

      const newExercise = workoutData.workoutExercises.find(
        (ex: any) => ex.exercise.id === parseInt(selectedExercise)
      );

      if (newExercise) {
        // Find the exercise to get history data
        const currentExercise = availableExercises.find(
          (ex: any) => ex.id === newExercise.exercise.id
        );
        
        // Get current mesocycle ID
        const currentMesocycleId = workoutData.mesocycleId || 
          workoutData.planInstanceDays?.[0]?.planInstance?.mesocycle?.id;
        
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
        const newExerciseTracking: ExerciseTracking = {
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
        };

        setExerciseTrackings((prev) => {
          const updated = [...prev, newExerciseTracking];
          return updated.sort((a, b) => a.order - b.order);
        });
      }

      setSelectedExercise('');
      setSelectedCategory('ALL');
      setAddExerciseModalVisible(false);
    } catch (err) {
      console.error('Error adding exercise:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add exercise');
    }
  };

  const getCategories = () => {
    const categories = new Set(availableExercises.map((ex) => ex.category));
    const categoryArray = Array.from(categories).sort();
    console.log('Available categories:', categoryArray);
    return categoryArray;
  };

  const getFilteredExercises = () => {
    let filtered;
    if (selectedCategory === 'ALL') {
      filtered = availableExercises;
    } else {
      filtered = availableExercises.filter((ex) => ex.category === selectedCategory);
    }
    console.log('Filtered exercises for category', selectedCategory, ':', filtered.length);
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
            onPress={() => setAddExerciseModalVisible(true)}
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

      {/* Add Exercise Modal */}
      <Modal
        visible={addExerciseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddExerciseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addExerciseModalContainer}>
            <View style={styles.addExerciseModalHeader}>
              <Text style={styles.addExerciseModalTitle}>Add Exercise</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddExerciseModalVisible(false);
                  setSelectedExercise('');
                  setSelectedCategory('ALL');
                }}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.addExerciseModalContent}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.pickerWrapper}
                  onPress={() => setCategoryPickerVisible(true)}
                >
                  <Text style={styles.pickerText}>
                    {selectedCategory === 'ALL'
                      ? 'All Categories'
                      : selectedCategory.charAt(0) + selectedCategory.slice(1).toLowerCase()}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Exercise</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerWrapper,
                    getFilteredExercises().length === 0 && styles.pickerWrapperDisabled,
                  ]}
                  onPress={() => {
                    if (getFilteredExercises().length > 0) {
                      setExercisePickerVisible(true);
                    } else {
                      Alert.alert('No Exercises', 'No exercises available for the selected category.');
                    }
                  }}
                  disabled={getFilteredExercises().length === 0}
                >
                  <Text style={[styles.pickerText, !selectedExercise && styles.pickerTextPlaceholder]}>
                    {selectedExercise
                      ? getFilteredExercises().find((ex) => ex.id.toString() === selectedExercise)?.name ||
                        'Select an exercise'
                      : getFilteredExercises().length === 0
                      ? 'No exercises available'
                      : 'Select an exercise'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#999" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.addExerciseButtonModal,
                  (!selectedExercise || isWorkoutCompleted) && styles.addExerciseButtonModalDisabled,
                ]}
                onPress={handleAddExercise}
                disabled={!selectedExercise || isWorkoutCompleted}
              >
                <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryPickerVisible(false)}
        >
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={['ALL', ...getCategories()]}
              keyExtractor={(item) => item}
              style={styles.pickerFlatList}
              contentContainerStyle={styles.pickerFlatListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedCategory === item && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(item);
                    setSelectedExercise('');
                    setCategoryPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedCategory === item && styles.pickerItemTextSelected,
                    ]}
                  >
                    {item === 'ALL'
                      ? 'All Categories'
                      : item.charAt(0) + item.slice(1).toLowerCase()}
                  </Text>
                  {selectedCategory === item && (
                    <MaterialIcons name="check" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPickerContainer}>
                  <Text style={styles.emptyPickerText}>No categories available</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal
        visible={exercisePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setExercisePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setExercisePickerVisible(false)}
        >
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setExercisePickerVisible(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getFilteredExercises()}
              keyExtractor={(item) => item.id.toString()}
              style={styles.pickerFlatList}
              contentContainerStyle={styles.pickerFlatListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedExercise === item.id.toString() && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedExercise(item.id.toString());
                    setExercisePickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedExercise === item.id.toString() && styles.pickerItemTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedExercise === item.id.toString() && (
                    <MaterialIcons name="check" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPickerContainer}>
                  <Text style={styles.emptyPickerText}>No exercises available</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
    color: '#999',
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addExerciseModalContainer: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  addExerciseModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  addExerciseModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  addExerciseModalContent: {
    padding: 20,
  },
  pickerContainer: {
    marginBottom: 24,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerWrapper: {
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerWrapperDisabled: {
    opacity: 0.5,
  },
  pickerText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  pickerTextPlaceholder: {
    color: '#666',
  },
  pickerModalContainer: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    height: '70%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  pickerFlatList: {
    flex: 1,
  },
  pickerFlatListContent: {
    paddingBottom: 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  pickerItemSelected: {
    backgroundColor: '#333',
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  pickerItemTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyPickerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyPickerText: {
    color: '#999',
    fontSize: 16,
  },
  addExerciseButtonModal: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addExerciseButtonModalDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  addExerciseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

