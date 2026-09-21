import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ALL_MUSCLES,
  e1rmSeries,
  muscleOverloadRate,
  rangeStart,
  repRangeShare,
  type Muscle,
  type RepBucket,
  type TimeRange,
} from '../analytics';
import { loadExerciseHistory, type ExerciseHistory } from './exerciseSessions';
import { useTrainingHistory } from './useTrainingHistory';
import { runLimited, type HookResult } from './cache';

const MAX_IN_FLIGHT = 4;

export interface ExerciseOption {
  id: number;
  name: string;
  muscle: Muscle | undefined;
  sessionsInRange: number;
}

export interface ProgressData {
  /** Exercises performed in the range, most sessions first. */
  exercises: ExerciseOption[];
  repRanges: Record<RepBucket, number>;
  hardSetsInRange: number;
  overload: Record<Muscle, number | null>;
  /** Whether every exercise's history has loaded. */
  complete: boolean;
}

/**
 * Rep-range share and per-muscle overload rates across every exercise
 * performed in the range. Fetches GET /api/exercises/:id for each, with at
 * most four requests in flight, and caches them for the session.
 */
export function useProgress(range: TimeRange): HookResult<ProgressData> {
  const history = useTrainingHistory();
  const { sessions, muscleOf } = history.data;
  const [histories, setHistories] = useState<Map<number, ExerciseHistory>>(new Map());
  const [fetching, setFetching] = useState(false);

  const start = useMemo(() => rangeStart(range, new Date()), [range]);

  const exercises = useMemo<ExerciseOption[]>(() => {
    const counts = new Map<number, number>();
    const names = new Map<number, string>();
    for (const s of sessions) {
      if (new Date(s.completedAt) < start) continue;
      for (const [id, n] of Object.entries(s.exerciseNames ?? {})) names.set(Number(id), n);
      for (const id of new Set(s.sets.map((set) => set.exerciseId))) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, n]) => ({ id, name: names.get(id) ?? 'Exercise', muscle: muscleOf(id), sessionsInRange: n }))
      .sort((a, b) => b.sessionsInRange - a.sessionsInRange || a.name.localeCompare(b.name));
  }, [sessions, start, muscleOf]);

  const fetchAll = useCallback(
    async (force: boolean) => {
      if (exercises.length === 0) return;
      setFetching(true);
      const results = await runLimited(
        exercises.map((e) => () => loadExerciseHistory(e.id, force)),
        MAX_IN_FLIGHT,
      );
      setHistories(new Map(results.filter((r): r is ExerciseHistory => !!r).map((r) => [r.id, r])));
      setFetching(false);
    },
    [exercises],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  const data = useMemo<ProgressData>(() => {
    const now = new Date();
    const inRange = (d: string) => new Date(d) >= start;
    // Rep ranges come from history so they show before the per-exercise fetches finish.
    const rangeSets = sessions.filter((s) => inRange(s.completedAt)).flatMap((s) => s.sets);
    const byMuscle = new Map<Muscle, { series: ReturnType<typeof e1rmSeries> }[]>();
    for (const h of histories.values()) {
      const m = h.muscle ?? muscleOf(h.id);
      if (!m) continue;
      const list = byMuscle.get(m) ?? [];
      list.push({ series: e1rmSeries(h.sessions) });
      byMuscle.set(m, list);
    }
    const overload = ALL_MUSCLES.reduce(
      (acc, m) => ({ ...acc, [m]: byMuscle.has(m) ? muscleOverloadRate(byMuscle.get(m)!, start, now) : null }),
      {} as Record<Muscle, number | null>,
    );
    return {
      exercises,
      repRanges: repRangeShare(rangeSets),
      hardSetsInRange: rangeSets.filter((s) => s.subSetNumber == null && s.reps > 0).length,
      overload,
      complete: !fetching && histories.size >= exercises.length,
    };
  }, [sessions, histories, exercises, start, muscleOf, fetching]);

  const refresh = useCallback(async () => {
    await history.refresh();
    await fetchAll(true);
  }, [history, fetchAll]);

  return { data, loading: history.loading, error: history.error, refresh };
}
