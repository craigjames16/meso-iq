import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { workoutService } from '../../services/workoutService';
import { dashboardService } from '../../services/dashboardService';
import type { WorkoutInstance } from '../../types/workout';
import type { MesocycleProgressData, PlanDay } from '../../types/mesocycle';
import {
  getVolumeForInstance,
  getExerciseVolumeBreakdown,
  type ExerciseVolumeRow,
} from '../../utils/workoutVolume';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themeColors, spacing, borderRadius } from '../../theme/colors';

type Route = RouteProp<RootStackParamList, 'WorkoutComplete'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'WorkoutComplete'>;

function countCompletedWorkoutDays(planDays: PlanDay[]): number {
  let n = 0;
  for (const day of planDays) {
    if (day.isRestDay) continue;
    const done = day.iterations.some((it) => it.completedAt != null);
    if (done) n += 1;
  }
  return n;
}

function countWorkoutDays(planDays: PlanDay[]): number {
  return planDays.filter((d) => !d.isRestDay).length;
}

export const WorkoutCompleteScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { workoutInstanceId } = params;

  const [instance, setInstance] = useState<WorkoutInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [mesoProgress, setMesoProgress] = useState<MesocycleProgressData | null>(null);
  const [mesoError, setMesoError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setMesoProgress(null);
    setMesoError(null);
    try {
      const data = (await workoutService.getWorkoutInstance(
        workoutInstanceId
      )) as WorkoutInstance;
      setInstance(data);

      const mesoId =
        data.planInstanceDays?.[0]?.planInstance?.mesocycle?.id ?? null;
      if (mesoId != null) {
        try {
          const progress = await dashboardService.getMesocycleProgress(mesoId);
          setMesoProgress(progress);
        } catch (e) {
          console.error('Mesocycle progress fetch failed:', e);
          setMesoError(
            e instanceof Error ? e.message : 'Mesocycle data unavailable'
          );
        }
      }
    } catch (e) {
      console.error('Workout instance fetch failed:', e);
      setLoadError(
        e instanceof Error ? e.message : 'Failed to load workout summary'
      );
      setInstance(null);
    } finally {
      setLoading(false);
    }
  }, [workoutInstanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDone = () => {
    navigation.navigate('Main', { screen: 'Track' });
  };

  const subtitle = (() => {
    if (!instance) return null;
    const planDay = instance.planInstanceDays?.[0]?.planDay;
    const planInstance = instance.planInstanceDays?.[0]?.planInstance;
    const week = planInstance?.iterationNumber;
    const day = planDay?.dayNumber;
    if (typeof week === 'number' && typeof day === 'number') {
      return `Week ${week} · Day ${day}`;
    }
    return instance.workout?.name ?? null;
  })();

  const totalVolume = instance ? getVolumeForInstance(instance) : 0;
  const exerciseRows: ExerciseVolumeRow[] = instance
    ? getExerciseVolumeBreakdown(instance)
    : [];

  const planInstance = instance?.planInstanceDays?.[0]?.planInstance;
  const mesoFromInstance = planInstance?.mesocycle;
  const currentWeek = planInstance?.iterationNumber ?? null;
  const totalWeeks =
    mesoProgress?.iterationVolumes && mesoProgress.iterationVolumes.length > 0
      ? Math.max(
          ...mesoProgress.iterationVolumes.map((v) => v.iterationNumber)
        )
      : null;

  const workoutDaysTotal = mesoProgress?.planDays
    ? countWorkoutDays(mesoProgress.planDays)
    : null;
  const workoutDaysDone = mesoProgress?.planDays
    ? countCompletedWorkoutDays(mesoProgress.planDays)
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
          <Text style={styles.muted}>Loading summary…</Text>
        </View>
      ) : loadError && !instance ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>Workout complete</Text>
          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}

          <View style={[styles.exerciseCard, styles.volumeCard]}>
            <View style={styles.exerciseCardInner}>
              <Text style={styles.volumeValue}>
                {Math.round(totalVolume).toLocaleString()}
              </Text>
              <Text style={styles.volumeUnit}>lbs total volume</Text>
            </View>
          </View>

          {exerciseRows.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              {exerciseRows.map((row, index) => (
                <View
                  key={`${row.exerciseId}-${index}`}
                  style={styles.exerciseCard}
                >
                  <View style={styles.exerciseCardInnerRow}>
                    <View style={styles.exerciseRowMain}>
                      <Text style={styles.recapExerciseName} numberOfLines={2}>
                        {row.exerciseName}
                      </Text>
                      <Text style={styles.exerciseMeta}>
                        {row.setCount} set{row.setCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.exerciseVolume}>
                      {Math.round(row.volume).toLocaleString()} lbs
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {(mesoFromInstance || mesoProgress || mesoError) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mesocycle</Text>
              <View style={styles.exerciseCard}>
                <View style={styles.exerciseCardInnerLeft}>
                  {mesoError && !mesoProgress ? (
                    <Text style={styles.mesoMuted}>{mesoError}</Text>
                  ) : (
                    <>
                      <Text style={styles.mesoName}>
                        {mesoProgress?.name ?? mesoFromInstance?.name ?? '—'}
                      </Text>
                      {mesoProgress?.plan?.name ? (
                        <Text style={styles.mesoPlan}>{mesoProgress.plan.name}</Text>
                      ) : null}
                      {currentWeek != null && totalWeeks != null ? (
                        <Text style={styles.mesoLine}>
                          Week {currentWeek} of {totalWeeks}
                        </Text>
                      ) : null}
                      {workoutDaysTotal != null && workoutDaysDone != null ? (
                        <Text style={styles.mesoLine}>
                          {workoutDaysDone} / {workoutDaysTotal} workout days
                          completed
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: spacing.xl + insets.bottom }]}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.85}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  headline: {
    color: themeColors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: themeColors.text.secondary,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  muted: {
    color: themeColors.text.muted,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  /** Matches ExerciseTrackingCard `exerciseCard` container */
  exerciseCard: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  exerciseCardInner: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  exerciseCardInnerLeft: {
    paddingHorizontal: spacing.md,
    alignSelf: 'stretch',
  },
  exerciseCardInnerRow: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeCard: {
    marginBottom: spacing.xl,
  },
  volumeValue: {
    color: themeColors.primary.light,
    fontSize: 44,
    fontWeight: '700',
  },
  volumeUnit: {
    color: themeColors.text.secondary,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: themeColors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  exerciseRowMain: {
    flex: 1,
    marginRight: spacing.md,
  },
  recapExerciseName: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseMeta: {
    color: themeColors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  exerciseVolume: {
    color: themeColors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  mesoName: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  mesoPlan: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  mesoLine: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  mesoMuted: {
    color: themeColors.text.muted,
    fontSize: 14,
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: themeColors.border.default,
    backgroundColor: themeColors.background.primary,
  },
  doneButton: {
    backgroundColor: themeColors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
