import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { plansService } from '../../services/plansService';
import { exercisesService } from '../../services/exercisesService';
import { Plan, ExerciseListItem, ExercisesByCategory } from '../../types/plan';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { PlanNameSection } from '../../components/plan/PlanNameSection';
import { DayRow } from '../../components/plan/DayRow';
import { ExerciseList } from '../../components/plan/ExerciseList';
import { AddExerciseModal } from '../../components/plan/AddExerciseModal';

type EditPlanScreenRouteProp = RouteProp<RootStackParamList, 'EditPlan'>;
type EditPlanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditPlan'>;

interface Exercise {
  id: number;
  name: string;
  category: string;
  order: number;
}

interface WorkoutDay {
  id: string;
  dayNumber: number;
  isRestDay: boolean;
  exercises: Exercise[];
}

export const EditPlanScreen: React.FC = () => {
  const route = useRoute<EditPlanScreenRouteProp>();
  const navigation = useNavigation<EditPlanScreenNavigationProp>();
  const { planId } = route.params;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [planName, setPlanName] = useState('');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [availableExercises, setAvailableExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [selectedDayForExercise, setSelectedDayForExercise] = useState<string | null>(null);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [autoSelectExerciseId, setAutoSelectExerciseId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchPlan();
    fetchExercises();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plansService.getPlan(planId);
      setPlan(data);
      setPlanName(data.name);

      // Transform API data to local state format
      const days: WorkoutDay[] = data.days
        .sort((a, b) => a.dayNumber - b.dayNumber)
        .map((day) => ({
          id: `day-${day.dayNumber}`,
          dayNumber: day.dayNumber,
          isRestDay: day.isRestDay,
          exercises: day.workout?.workoutExercises
            .sort((a, b) => a.order - b.order)
            .map((we) => ({
              id: we.exercise.id,
              name: we.exercise.name,
              category: we.exercise.category,
              order: we.order,
            })) || [],
        }));

      setWorkoutDays(days);
      // Expand all days by default
      if (days.length > 0) {
        setExpandedDays(new Set(days.map(day => day.id)));
      }
    } catch (err: any) {
      console.error('Failed to fetch plan', err);
      setError(err.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      const data = await exercisesService.getExercises();
      // Flatten exercises by category into a single array
      const allExercises = Object.entries(data).flatMap(([category, exerciseList]) =>
        exerciseList.map((exercise) => ({
          ...exercise,
          category: category,
        }))
      );
      setAvailableExercises(allExercises);
    } catch (err: any) {
      console.error('Failed to fetch exercises', err);
    }
  };

  const toggleDayExpand = (dayId: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayId)) {
        newSet.delete(dayId);
      } else {
        newSet.add(dayId);
      }
      return newSet;
    });
  };

  const addWorkoutDay = () => {
    const dayNumber = workoutDays.length + 1;
    const newDay: WorkoutDay = {
      id: `day-${dayNumber}`,
      dayNumber: dayNumber,
      isRestDay: false,
      exercises: [],
    };
    setWorkoutDays([...workoutDays, newDay]);
    setExpandedDays((prev) => new Set([...prev, newDay.id]));
  };

  const removeWorkoutDay = (dayId: string) => {
    const day = workoutDays.find((d) => d.id === dayId);
    if (day && day.exercises.length > 0) {
      Alert.alert(
        'Delete Day',
        'This day has exercises. Are you sure you want to delete it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setWorkoutDays((prev) => prev.filter((d) => d.id !== dayId));
              setExpandedDays((prev) => {
                const newSet = new Set(prev);
                newSet.delete(dayId);
                return newSet;
              });
            },
          },
        ]
      );
    } else {
      setWorkoutDays((prev) => prev.filter((d) => d.id !== dayId));
      setExpandedDays((prev) => {
        const newSet = new Set(prev);
        newSet.delete(dayId);
        return newSet;
      });
    }
  };

  const toggleRestDay = (dayId: string) => {
    setWorkoutDays((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            isRestDay: !day.isRestDay,
            exercises: !day.isRestDay ? [] : day.exercises, // Clear exercises when switching to rest day
          };
        }
        return day;
      })
    );
  };

  const handleAddExercise = (dayId: string) => {
    setSelectedDayForExercise(dayId);
    setAddExerciseModalVisible(true);
  };

  const handleSelectExercises = (exercises: ExerciseListItem[]) => {
    if (!selectedDayForExercise) return;

    const day = workoutDays.find((d) => d.id === selectedDayForExercise);
    if (!day || day.isRestDay) return;

    // Filter out exercises that already exist in the day
    const newExercises: Exercise[] = exercises
      .filter((exercise) => {
        if (day.exercises.some((ex) => ex.id === exercise.id)) {
          return false;
        }
        return true;
      })
      .map((exercise, index) => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        order: day.exercises.length + index + 1,
      }));

    if (newExercises.length === 0) {
      Alert.alert('Exercise Already Added', 'All selected exercises are already in the day.');
      return;
    }

    if (newExercises.length < exercises.length) {
      Alert.alert(
        'Some Exercises Already Added',
        `${exercises.length - newExercises.length} exercise(s) were already in the day and were skipped.`
      );
    }

    setWorkoutDays((prev) =>
      prev.map((d) => {
        if (d.id === selectedDayForExercise) {
          return {
            ...d,
            exercises: [...d.exercises, ...newExercises],
          };
        }
        return d;
      })
    );

    // Clear auto-select after selection
    setAutoSelectExerciseId(null);
    setAddExerciseModalVisible(false);
  };

  const handleRemoveExercise = (dayId: string, exerciseId: number) => {
    setWorkoutDays((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          const updatedExercises = day.exercises
            .filter((ex) => ex.id !== exerciseId)
            .map((ex, index) => ({ ...ex, order: index + 1 }));
          return {
            ...day,
            exercises: updatedExercises,
          };
        }
        return day;
      })
    );
  };

  const handleReorderExercises = (dayId: string, reorderedExercises: Exercise[]) => {
    setWorkoutDays((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            exercises: reorderedExercises,
          };
        }
        return day;
      })
    );
  };

  const handleCreateExercise = async (name: string, category: string) => {
    try {
      setCreatingExercise(true);
      const newExercise = await exercisesService.createExercise({ name, category });
      
      // Refresh exercises list
      await fetchExercises();

      // Auto-select the newly created exercise
      setAutoSelectExerciseId(newExercise.id);
    } catch (err: any) {
      console.error('Failed to create exercise', err);
      Alert.alert('Error', err.message || 'Failed to create exercise');
      throw err;
    } finally {
      setCreatingExercise(false);
    }
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }

    if (workoutDays.length === 0) {
      Alert.alert('Error', 'Please add at least one day to the plan');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Transform local state back to API format
      const days = workoutDays.map((day) => ({
        isRestDay: day.isRestDay,
        workoutExercises: day.exercises.map((ex) => ({
          id: ex.id,
          order: ex.order,
        })),
      }));

      await plansService.updatePlan(planId, {
        name: planName.trim(),
        days,
      });

      // Show success message and auto-navigate back
      setShowSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save plan', err);
      setError(err.message || 'Failed to save plan');
      Alert.alert('Error', err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading plan...</Text>
      </View>
    );
  }

  if (error && !plan) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchPlan} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Name Section */}
        <PlanNameSection planName={planName} onPlanNameChange={setPlanName} />

        {/* Success Message */}
        {showSuccess && (
          <View style={styles.successBanner}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={themeColors.accent.success || '#10b981'}
            />
            <Text style={styles.successBannerText}>Plan updated successfully</Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Add Day Button */}
        <TouchableOpacity
          style={styles.addDayButton}
          onPress={addWorkoutDay}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="add"
            size={20}
            color={themeColors.primary.main}
          />
          <Text style={styles.addDayButtonText}>Add Day</Text>
        </TouchableOpacity>

        {/* Days List */}
        {workoutDays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No days in this plan</Text>
            <Text style={styles.emptySubtext}>
              Tap "Add Day" to create your first workout day
            </Text>
          </View>
        ) : (
          workoutDays.map((day) => (
            <DayRow
              key={day.id}
              dayId={day.id}
              dayNumber={day.dayNumber}
              isRestDay={day.isRestDay}
              exercises={day.exercises}
              isExpanded={expandedDays.has(day.id)}
              onToggleExpand={() => toggleDayExpand(day.id)}
              onToggleRestDay={() => toggleRestDay(day.id)}
              onDeleteDay={() => removeWorkoutDay(day.id)}
              onAddExercise={() => handleAddExercise(day.id)}
            >
              <ExerciseList
                exercises={day.exercises}
                onReorder={(reordered) => handleReorderExercises(day.id, reordered)}
                onRemoveExercise={(exerciseId) => handleRemoveExercise(day.id, exerciseId)}
              />
            </DayRow>
          ))
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!planName.trim() || workoutDays.length === 0 || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!planName.trim() || workoutDays.length === 0 || saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color={themeColors.text.primary} />
          ) : (
            <>
              <MaterialIcons
                name="save"
                size={20}
                color={themeColors.text.primary}
              />
              <Text style={styles.saveButtonText}>Save Plan</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Add Exercise Modal (combined with create) */}
      <AddExerciseModal
        visible={addExerciseModalVisible}
        onClose={() => {
          setAddExerciseModalVisible(false);
          setSelectedDayForExercise(null);
          setAutoSelectExerciseId(null);
        }}
        exercises={availableExercises}
        onSelectExercises={handleSelectExercises}
        onCreateExercise={handleCreateExercise}
        creating={creatingExercise}
        autoSelectExerciseId={autoSelectExerciseId}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background.primary,
  },
  loadingText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  retryText: {
    color: themeColors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  successBannerText: {
    color: themeColors.accent.success || '#10b981',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    color: themeColors.accent.error,
    fontSize: 14,
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  addDayButtonText: {
    color: themeColors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: themeColors.text.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
