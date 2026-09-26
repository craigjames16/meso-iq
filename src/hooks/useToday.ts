import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { workoutService } from '../services/workoutService';
import { useSchedule } from '../context/ScheduleContext';
import type { CurrentMesocycle, LatestWorkoutResponse, PlanInstanceDay } from '../types/workout';
import { invalidateMesocycles } from './mesocycleData';
import { errorMessage } from './cache';

export interface InProgressWorkout {
  workoutInstanceId: number;
  workoutName: string;
  /** Main sets logged so far. */
  loggedSets: number;
  /** Muscle categories of the workout's exercises. */
  categories: string[];
  mesocycleName: string | null;
  iteration: number | null;
  dayNumber: number | null;
}

export interface TodayState {
  mesocycle: CurrentMesocycle | null;
  /** The next plan day, from the schedule's upcoming days. */
  nextDay: PlanInstanceDay | null;
  upcomingDays: PlanInstanceDay[];
  inProgress: InProgressWorkout | null;
  loading: boolean;
  error: string | null;
  starting: boolean;
  refresh: () => Promise<void>;
  /**
   * Starts the next plan day. Rest days are completed instead, and resolve
   * to null. When the next day belongs to a week that doesn't exist yet
   * (placeholder id -1), the week is created first.
   */
  startNextDay: () => Promise<number | null>;
}

type UpcomingDay = PlanInstanceDay & {
  planDay: PlanInstanceDay['planDay'] & {
    workout?: { id: number; name: string; workoutExercises?: Array<{ exercise: { id: number; name: string; category?: string }; order: number }> } | null;
  };
};

/** The Track tab's data: current mesocycle, next plan day and any in-progress workout. */
export function useToday(): TodayState {
  const { schedule, fetchSchedule, refreshSchedule, clearSchedule, loading: scheduleLoading } = useSchedule();
  const [mesocycle, setMesocycle] = useState<CurrentMesocycle | null>(null);
  const [inProgress, setInProgress] = useState<InProgressWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const mesoRef = useRef<CurrentMesocycle | null>(null);

  const loadInProgress = useCallback(async (latest: LatestWorkoutResponse) => {
    if (!latest.inProgress || !latest.workoutInstanceId) {
      setInProgress(null);
      return;
    }
    let loggedSets = 0;
    let categories: string[] = [];
    try {
      const instance = await workoutService.getWorkoutInstance(latest.workoutInstanceId);
      const wes = (instance?.workoutExercises ?? []) as Array<{
        exercise?: { category?: string };
        sets?: Array<{ subSetNumber?: number | null; reps: number }>;
      }>;
      loggedSets = wes.flatMap((we) => we.sets ?? []).filter((s) => s.subSetNumber == null && s.reps > 0).length;
      categories = wes.map((we) => we.exercise?.category ?? '').filter(Boolean);
    } catch {
      // The hero still resumes without the count.
    }
    setInProgress({
      workoutInstanceId: latest.workoutInstanceId,
      workoutName: latest.workoutName || 'Workout',
      loggedSets,
      categories,
      mesocycleName: latest.mesocycle?.name ?? null,
      iteration: latest.iterationNumber ?? null,
      dayNumber: latest.dayNumber ?? null,
    });
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const latest = await workoutService.getLatestWorkout();
      const prev = mesoRef.current;
      const nextMeso = latest?.mesocycle && latest.mesocycleId ? latest.mesocycle : null;

      if (nextMeso && latest?.mesocycleId) {
        if (!prev || prev.id !== latest.mesocycleId) {
          // A different mesocycle: fetch its schedule fresh.
          await fetchSchedule(latest.mesocycleId, true).catch(() => undefined);
        } else {
          // Same mesocycle: refresh so a new cycle's first day shows.
          await refreshSchedule().catch(() => undefined);
        }
      } else if (prev) {
        clearSchedule();
      }
      mesoRef.current = nextMeso;
      setMesocycle(nextMeso);
      if (latest) await loadInProgress(latest);
      else setInProgress(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoaded(true);
    }
  }, [fetchSchedule, refreshSchedule, clearSchedule, loadInProgress]);

  useFocusEffect(
    useCallback(() => {
      setStarting(false);
      refresh();
    }, [refresh]),
  );

  const upcomingDays = (mesocycle ? schedule?.upcomingDays ?? [] : []) as UpcomingDay[];
  const nextDay = upcomingDays[0] ?? null;

  const startNextDay = useCallback(async (): Promise<number | null> => {
    const day = nextDay;
    const meso = mesocycle;
    if (!day) return null;
    setStarting(true);
    try {
      if (day.id === -1 || day.planInstanceId === -1) {
        // The week doesn't exist yet: create it, then start or complete its matching day.
        const iterationNumber = day.planInstance?.iterationNumber || 1;
        const newIteration = await workoutService.createPlanInstance(
          meso?.plan.id || 0,
          meso?.id,
          typeof iterationNumber === 'number' ? iterationNumber : undefined,
        );
        const firstDay = newIteration.days.find((d: any) => d.planDayId === day.planDayId) || newIteration.days[0];
        invalidateMesocycles(meso?.id);
        if (firstDay.planDay.isRestDay || !firstDay.planDay.workout) {
          await workoutService.completeRestDay(newIteration.id, firstDay.id);
          await refreshSchedule();
          setStarting(false);
          return null;
        }
        const instance = await workoutService.startWorkout(newIteration.id, firstDay.id);
        return instance.id;
      }

      if (!day.planInstanceId || !day.id) {
        throw new Error('Missing required workout information. Pull to refresh and try again.');
      }
      if (day.planDay?.isRestDay) {
        await workoutService.completeRestDay(day.planInstanceId, day.id);
        invalidateMesocycles(meso?.id);
        await refreshSchedule();
        setStarting(false);
        return null;
      }
      const instance = await workoutService.startWorkout(day.planInstanceId, day.id);
      invalidateMesocycles(meso?.id);
      return instance.id;
    } catch (err) {
      setStarting(false);
      throw err;
    }
  }, [nextDay, mesocycle, refreshSchedule]);

  return {
    mesocycle,
    nextDay,
    upcomingDays,
    inProgress,
    loading: !loaded || (scheduleLoading && !schedule),
    error,
    starting,
    refresh,
    startNextDay,
  };
}
