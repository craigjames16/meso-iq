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
import { mesocyclesService } from '../../services/mesocyclesService';
import { workoutService } from '../../services/workoutService';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { MesocycleDetail, PlanInstance, PlanInstanceDay } from '../../types/plan';
import { BottomDrawer } from '../../components/BottomDrawer';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

type MesocycleDetailScreenRouteProp = RouteProp<RootStackParamList, 'MesocycleDetail'>;
type MesocycleDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MesocycleDetail'>;

export const MesocycleDetailScreen: React.FC = () => {
  const route = useRoute<MesocycleDetailScreenRouteProp>();
  const navigation = useNavigation<MesocycleDetailScreenNavigationProp>();
  const { mesocycleId } = route.params;

  const [mesocycle, setMesocycle] = useState<MesocycleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [completeDialogVisible, setCompleteDialogVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [processingDay, setProcessingDay] = useState<{ instanceId: number; dayId: number } | null>(null);

  useEffect(() => {
    fetchMesocycle();
  }, [mesocycleId]);

  const fetchMesocycle = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mesocyclesService.getMesocycle(mesocycleId);
      setMesocycle(data);
    } catch (err: any) {
      console.error('Failed to fetch mesocycle', err);
      setError(err.message || 'Failed to load mesocycle');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (instances: PlanInstance[]) => {
    if (!instances.length) return 0;
    const completedCount = instances.filter(i => i.completedAt).length;
    return (completedCount / instances.length) * 100;
  };

  const isInstanceComplete = (instance: PlanInstance) => {
    if (instance.completedAt) return true;
    
    return instance.days.every(day => 
      day.planDay.isRestDay ? day.isComplete : day.workoutInstance?.completedAt != null
    );
  };

  const getCurrentIteration = (instances: PlanInstance[]) => {
    return instances.find(i => !isInstanceComplete(i));
  };

  const handleDelete = async () => {
    try {
      await mesocyclesService.deleteMesocycle(mesocycleId);
      setDeleteDialogVisible(false);
      navigation.goBack();
    } catch (err: any) {
      console.error('Failed to delete mesocycle', err);
      Alert.alert('Error', err.message || 'Failed to delete mesocycle');
      setDeleteDialogVisible(false);
    }
  };

  const handleComplete = async () => {
    try {
      const updatedMesocycle = await mesocyclesService.completeMesocycle(mesocycleId);
      setMesocycle(updatedMesocycle);
      setCompleteDialogVisible(false);
      setMenuVisible(false);
    } catch (err: any) {
      console.error('Failed to complete mesocycle', err);
      Alert.alert('Error', err.message || 'Failed to complete mesocycle');
      setCompleteDialogVisible(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'COMPLETE':
        return <MaterialIcons name="check-circle" size={24} color={themeColors.accent.success} />;
      case 'IN_PROGRESS':
        return <MaterialIcons name="play-circle-filled" size={24} color={themeColors.primary.main} />;
      default:
        return <MaterialIcons name="play-circle-outline" size={24} color={themeColors.text.secondary} />;
    }
  };

  const handleCompleteRestDay = async (instanceId: number, dayId: number) => {
    try {
      setProcessingDay({ instanceId, dayId });
      await workoutService.completeRestDay(instanceId, dayId);
      await fetchMesocycle();
    } catch (err: any) {
      console.error('Failed to complete rest day', err);
      Alert.alert('Error', err.message || 'Failed to complete rest day');
    } finally {
      setProcessingDay(null);
    }
  };

  const handleStartWorkout = async (instanceId: number, dayId: number) => {
    try {
      setProcessingDay({ instanceId, dayId });
      const workoutInstance = await workoutService.startWorkout(instanceId, dayId);
      navigation.navigate('WorkoutDetail', { workoutInstanceId: workoutInstance.id });
    } catch (err: any) {
      console.error('Failed to start workout', err);
      Alert.alert('Error', err.message || 'Failed to start workout');
      setProcessingDay(null);
    }
  };

  const handleDayPress = (day: PlanInstanceDay, instance: PlanInstance) => {
    if (processingDay) return;

    const isRestDay = day.planDay.isRestDay;
    const isWorkoutStarted = day.workoutInstance && !day.workoutInstance.completedAt;
    const isWorkoutComplete = day.workoutInstance?.completedAt;

    if (isRestDay && !day.isComplete) {
      handleCompleteRestDay(instance.id, day.id);
    } else if (!isRestDay && !day.workoutInstance) {
      handleStartWorkout(instance.id, day.id);
    } else if (!isRestDay && (isWorkoutStarted || isWorkoutComplete)) {
      navigation.navigate('WorkoutDetail', { workoutInstanceId: day.workoutInstance!.id });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading mesocycle...</Text>
      </View>
    );
  }

  if (error || !mesocycle) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Mesocycle not found'}</Text>
          <TouchableOpacity onPress={fetchMesocycle} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const progress = calculateProgress(mesocycle.instances);
  const currentIteration = getCurrentIteration(mesocycle.instances);

  return (
    <View style={styles.container}>
      {/* Sticky Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <View style={styles.headerTitleRow}>
              <MaterialIcons
                name="fitness-center"
                size={24}
                color={themeColors.primary.main}
              />
              <Text style={styles.mesocycleName}>{mesocycle.name}</Text>
            </View>
            <Text style={styles.planName}>Based on plan: {mesocycle.plan.name}</Text>
            <View style={styles.headerInfo}>
              <View style={styles.infoChip}>
                <MaterialIcons
                  name="calendar-today"
                  size={16}
                  color={themeColors.text.secondary}
                />
                <Text style={styles.infoText}>
                  Started {new Date(mesocycle.startedAt).toLocaleDateString()}
                </Text>
              </View>
              {mesocycle.status === 'COMPLETE' && (
                <View style={[styles.infoChip, styles.completeChip]}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={themeColors.accent.success}
                  />
                  <Text style={[styles.infoText, styles.completeChipText]}>Complete</Text>
                </View>
              )}
              {currentIteration && (
                <View style={[styles.infoChip, styles.progressChip]}>
                  <MaterialIcons
                    name="play-circle-filled"
                    size={16}
                    color={themeColors.primary.main}
                  />
                  <Text style={[styles.infoText, styles.progressChipText]}>
                    Week {currentIteration.iterationNumber} in progress
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
          >
            <MaterialIcons
              name="more-vert"
              size={24}
              color={themeColors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Progress: {Math.round(progress)}%
            </Text>
            <Text style={styles.progressText}>
              {mesocycle.instances.filter(i => i.completedAt).length} / {mesocycle.iterations} weeks completed
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      {/* Scrollable Weeks List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Weeks List */}
        <View style={styles.weeksContainer}>
          {mesocycle.instances
            .sort((a, b) => a.iterationNumber - b.iterationNumber)
            .map((instance) => {
              const isComplete = isInstanceComplete(instance);
              return (
                <View key={instance.id} style={styles.weekCard}>
                  <View style={styles.weekHeader}>
                    {getStatusIcon(instance.status)}
                    <View style={styles.weekHeaderText}>
                      <Text style={styles.weekTitle}>Week {instance.iterationNumber}</Text>
                      <Text style={styles.weekSubtext}>Target RIR: {instance.rir}</Text>
                    </View>
                    {isComplete && (
                      <View style={styles.completeBadge}>
                        <MaterialIcons
                          name="check-circle"
                          size={16}
                          color={themeColors.accent.success}
                        />
                        <Text style={styles.completeBadgeText}>Complete</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.daysContainer}>
                    {instance.days
                      .sort((a, b) => a.planDay.dayNumber - b.planDay.dayNumber)
                      .map((day, index) => {
                        const isRestDay = day.planDay.isRestDay;
                        const isWorkoutStarted = day.workoutInstance && !day.workoutInstance.completedAt;
                        const isWorkoutComplete = day.workoutInstance?.completedAt;
                        const isProcessing = processingDay?.instanceId === instance.id && processingDay?.dayId === day.id;

                        let onClick = undefined;
                        if (!isProcessing) {
                          if (isRestDay && !day.isComplete) {
                            onClick = () => handleDayPress(day, instance);
                          } else if (!isRestDay && !day.workoutInstance) {
                            onClick = () => handleDayPress(day, instance);
                          } else if (!isRestDay && (isWorkoutStarted || isWorkoutComplete)) {
                            onClick = () => handleDayPress(day, instance);
                          }
                        }

                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dayItem,
                              day.isComplete && styles.dayItemComplete,
                              !onClick && styles.dayItemDisabled,
                            ]}
                            onPress={onClick}
                            disabled={!onClick || isProcessing}
                          >
                            <View style={styles.dayContent}>
                              <Text style={[
                                styles.dayText,
                                day.isComplete && styles.dayTextComplete,
                              ]}>
                                Day {day.planDay.dayNumber}: {isRestDay ? 'Rest Day' : 'Workout Day'}
                              </Text>
                              {isProcessing ? (
                                <ActivityIndicator size="small" color={themeColors.primary.main} />
                              ) : day.isComplete ? (
                                <MaterialIcons
                                  name="check-circle"
                                  size={20}
                                  color={themeColors.accent.success}
                                />
                              ) : (
                                <MaterialIcons
                                  name="play-circle-outline"
                                  size={20}
                                  color={themeColors.text.secondary}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              );
            })}
        </View>

        {mesocycle.status === 'COMPLETE' && (
          <View style={styles.completeMessage}>
            <MaterialIcons
              name="check-circle"
              size={48}
              color={themeColors.accent.success}
            />
            <Text style={styles.completeMessageText}>
              Mesocycle completed! Great job!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Menu Drawer */}
      <BottomDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Options"
        items={[
          ...(mesocycle.status !== 'COMPLETE'
            ? [
                {
                  label: 'Complete Mesocycle',
                  icon: 'stop-circle',
                  onPress: () => setCompleteDialogVisible(true),
                },
              ]
            : []),
          {
            label: 'Delete Mesocycle',
            icon: 'delete',
            onPress: () => setDeleteDialogVisible(true),
            destructive: true,
          },
        ]}
      />

      {/* Delete Confirmation Drawer */}
      <BottomDrawer
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
        title="Delete Mesocycle"
      >
        <View style={styles.dialogContent}>
          <Text style={styles.dialogMessage}>
            Are you sure you want to delete this mesocycle? This will delete all associated plan instances,
            workout instances, and progress data. This action cannot be undone.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.cancelButton]}
              onPress={() => setDeleteDialogVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomDrawer>

      {/* Complete Confirmation Drawer */}
      <BottomDrawer
        visible={completeDialogVisible}
        onClose={() => setCompleteDialogVisible(false)}
        title="Complete Mesocycle"
      >
        <View style={styles.dialogContent}>
          <Text style={styles.dialogMessage}>
            Are you sure you want to complete this mesocycle? This will mark the mesocycle as complete.
            Your progress data will be preserved, but you won't be able to continue tracking workouts
            for this mesocycle.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.cancelButton]}
              onPress={() => setCompleteDialogVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, styles.completeButton]}
              onPress={handleComplete}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
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
  header: {
    backgroundColor: themeColors.background.primary,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mesocycleName: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
  },
  planName: {
    fontSize: 14,
    color: themeColors.text.secondary,
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
  completeChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  completeChipText: {
    color: themeColors.accent.success,
  },
  progressChip: {
    backgroundColor: `rgba(136, 132, 216, 0.1)`,
    borderColor: themeColors.primary.main,
  },
  progressChipText: {
    color: themeColors.primary.main,
  },
  menuButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  progressSection: {
    marginTop: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressText: {
    fontSize: 12,
    color: themeColors.text.secondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.sm,
  },
  weeksContainer: {
    gap: spacing.md,
  },
  weekCard: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text.primary,
  },
  weekSubtext: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginTop: spacing.xs,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  completeBadgeText: {
    color: themeColors.accent.success,
    fontSize: 12,
    fontWeight: '600',
  },
  daysContainer: {
    gap: spacing.sm,
  },
  dayItem: {
    backgroundColor: themeColors.background.elevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.sm,
  },
  dayItemComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dayItemDisabled: {
    opacity: 0.5,
  },
  dayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    color: themeColors.text.primary,
    fontWeight: '500',
  },
  dayTextComplete: {
    color: themeColors.accent.success,
  },
  completeMessage: {
    alignItems: 'center',
    padding: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  completeMessageText: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.accent.success,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  dialogContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  dialogMessage: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dialogButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  cancelButtonText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: themeColors.accent.error,
  },
  deleteButtonText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: themeColors.accent.warning,
  },
  completeButtonText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

