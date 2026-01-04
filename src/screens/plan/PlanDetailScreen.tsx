import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { plansService } from '../../services/plansService';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { Plan } from '../../types/plan';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

type PlanDetailScreenRouteProp = RouteProp<RootStackParamList, 'PlanDetail'>;
type PlanDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlanDetail'>;

export const PlanDetailScreen: React.FC = () => {
  const route = useRoute<PlanDetailScreenRouteProp>();
  const navigation = useNavigation<PlanDetailScreenNavigationProp>();
  const { planId } = route.params;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plansService.getPlan(planId);
      setPlan(data);
    } catch (err: any) {
      console.error('Failed to fetch plan', err);
      setError(err.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = () => {
    navigation.navigate('EditPlan', { planId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading plan...</Text>
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Plan not found'}</Text>
          <TouchableOpacity onPress={fetchPlan} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const restDaysCount = plan.days.filter(day => day.isRestDay).length;
  const workoutDaysCount = plan.days.length - restDaysCount;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.headerInfo}>
              <View style={styles.infoChip}>
                <MaterialIcons
                  name="calendar-today"
                  size={16}
                  color={themeColors.text.secondary}
                />
                <Text style={styles.infoText}>{plan.days.length} days</Text>
              </View>
              {restDaysCount > 0 && (
                <View style={styles.infoChip}>
                  <MaterialIcons
                    name="hotel"
                    size={16}
                    color={themeColors.text.secondary}
                  />
                  <Text style={styles.infoText}>{restDaysCount} rest days</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleEditPlan}
            style={styles.editButton}
          >
            <MaterialIcons
              name="edit"
              size={24}
              color={themeColors.primary.main}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Days List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {plan.days.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No days in this plan</Text>
            <Text style={styles.emptySubtext}>
              Add days to your plan to get started
            </Text>
          </View>
        ) : (
          plan.days
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((day) => (
              <View key={day.id} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  {day.isRestDay ? (
                    <MaterialIcons
                      name="hotel"
                      size={24}
                      color={themeColors.text.muted}
                    />
                  ) : (
                    <MaterialIcons
                      name="fitness-center"
                      size={24}
                      color={themeColors.primary.main}
                    />
                  )}
                  <Text style={styles.dayTitle}>Day {day.dayNumber}</Text>
                  {day.isRestDay && (
                    <View style={styles.restBadge}>
                      <Text style={styles.restBadgeText}>Rest Day</Text>
                    </View>
                  )}
                </View>

                {day.isRestDay ? (
                  <Text style={styles.restDayText}>
                    Rest and recovery day
                  </Text>
                ) : day.workout ? (
                  <View style={styles.workoutContent}>
                    <Text style={styles.workoutName}>{day.workout.name}</Text>
                    <Text style={styles.exerciseCount}>
                      {day.workout.workoutExercises.length} exercise
                      {day.workout.workoutExercises.length !== 1 ? 's' : ''}
                    </Text>
                    <View style={styles.exercisesContainer}>
                      {day.workout.workoutExercises
                        .sort((a, b) => a.order - b.order)
                        .map((workoutExercise) => (
                          <View
                            key={workoutExercise.id}
                            style={styles.exerciseChip}
                          >
                            <Text style={styles.exerciseChipText}>
                              {workoutExercise.exercise.name}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noWorkoutText}>
                    No workout assigned
                  </Text>
                )}
              </View>
            ))
        )}
      </ScrollView>
    </View>
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
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: spacing.sm,
  },
  headerInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: themeColors.background.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  infoText: {
    color: themeColors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  emptyContainer: {
    padding: spacing.xl * 2,
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
  dayCard: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  restBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  restBadgeText: {
    color: themeColors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  restDayText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  workoutContent: {
    marginTop: spacing.xs,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.xs,
  },
  exerciseCount: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginBottom: spacing.sm,
  },
  exercisesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseChip: {
    backgroundColor: themeColors.background.elevated,
    borderWidth: 1,
    borderColor: themeColors.primary.main,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  exerciseChipText: {
    color: themeColors.primary.main,
    fontSize: 12,
    fontWeight: '500',
  },
  noWorkoutText: {
    color: themeColors.accent.error,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

