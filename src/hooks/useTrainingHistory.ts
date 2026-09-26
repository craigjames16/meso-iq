import { useCallback, useEffect, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import {
  muscleMapFromHistory,
  muscleOfFrom,
  sessionsFromHistory,
  type Muscle,
  type MuscleOf,
  type Session,
} from '../analytics';
import { useExerciseLibrary } from './useExerciseLibrary';
import type { HookResult } from './cache';

export interface TrainingHistory {
  /** Completed sessions, oldest first. */
  sessions: Session[];
  muscleOf: MuscleOf;
  /** Latest completedAt per exercise id. */
  lastPerformed: Map<number, string>;
  /** Completed session count per exercise id. */
  sessionCounts: Map<number, number>;
  loaded: boolean;
}

/** Completed sessions from ScheduleContext.fetchHistory(), plus a muscle lookup. */
export function useTrainingHistory(): HookResult<TrainingHistory> {
  const { history, fetchHistory, loading: scheduleLoading, error: scheduleError } = useSchedule();
  const library = useExerciseLibrary();

  useEffect(() => {
    fetchHistory().catch(() => {
      // The context records the error.
    });
  }, [fetchHistory]);

  const instances = useMemo(() => history?.workoutInstances ?? [], [history]);
  const sessions = useMemo(() => sessionsFromHistory(instances), [instances]);

  const muscleOf = useMemo(() => {
    const fromLibrary = new Map<number, Muscle>();
    for (const ex of library.data.exercises) if (ex.muscle) fromLibrary.set(ex.id, ex.muscle);
    return muscleOfFrom(fromLibrary, muscleMapFromHistory(instances));
  }, [library.data.exercises, instances]);

  const { lastPerformed, sessionCounts } = useMemo(() => {
    const last = new Map<number, string>();
    const counts = new Map<number, number>();
    for (const s of sessions) {
      const seen = new Set<number>();
      for (const set of s.sets) {
        if (seen.has(set.exerciseId)) continue;
        seen.add(set.exerciseId);
        counts.set(set.exerciseId, (counts.get(set.exerciseId) ?? 0) + 1);
        const prev = last.get(set.exerciseId);
        if (!prev || prev < s.completedAt) last.set(set.exerciseId, s.completedAt);
      }
    }
    return { lastPerformed: last, sessionCounts: counts };
  }, [sessions]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchHistory(true).catch(() => undefined), library.refresh()]);
  }, [fetchHistory, library]);

  return {
    data: { sessions, muscleOf, lastPerformed, sessionCounts, loaded: history != null },
    loading: history == null && (scheduleLoading || library.loading),
    error: history == null ? scheduleError : null,
    refresh,
  };
}
