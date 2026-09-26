import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  e1rmSeries,
  isStalled,
  linearFit,
  liftRecords,
  matrixCaption,
  rangeStart,
  volume,
  weightRepMatrix,
  type ExerciseSession,
  type LiftRecords,
  type SeriesPoint,
  type TimeRange,
} from '../analytics';
import { cachedExerciseHistory, loadExerciseHistory, type ExerciseHistory } from './exerciseSessions';
import { errorMessage, type HookResult } from './cache';

export interface ExerciseProgress {
  exercise: ExerciseHistory | null;
  /** All sessions, oldest first. */
  sessions: ExerciseSession[];
  /** Sessions in the range. */
  rangeSessions: ExerciseSession[];
  /** e1RM points in the range. PR flags compare against all earlier sessions. */
  series: SeriesPoint[];
  /** Session volume per session in the range. */
  volumeSeries: { workoutInstanceId: number; date: string; volume: number }[];
  /** All-time records. */
  records: LiftRecords;
  matrix: ReturnType<typeof weightRepMatrix>;
  matrixCaption: string | null;
  stalled: boolean;
  /** Linear trend through the range's e1RM points: y per millisecond from the first point. */
  trend: { slope: number; intercept: number } | null;
}

const EMPTY_RECORDS: LiftRecords = { heaviest: null, mostReps: null, bestSessionVolume: null, bestE1rm: null };

/** Strength data for one exercise, from GET /api/exercises/:id. */
export function useExerciseProgress(exerciseId: number | null, range: TimeRange): HookResult<ExerciseProgress> {
  const [exercise, setExercise] = useState<ExerciseHistory | null>(() =>
    exerciseId != null ? cachedExerciseHistory(exerciseId) ?? null : null,
  );
  const [loading, setLoading] = useState(exerciseId != null && !exercise);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      if (exerciseId == null) {
        setExercise(null);
        setLoading(false);
        return;
      }
      const cached = cachedExerciseHistory(exerciseId);
      setExercise(cached ?? null);
      setLoading(!cached || force);
      setError(null);
      try {
        setExercise(await loadExerciseHistory(exerciseId, force));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [exerciseId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const data = useMemo<ExerciseProgress>(() => {
    const sessions = exercise?.sessions ?? [];
    const start = rangeStart(range, new Date()).getTime();
    const inRange = (d: string) => new Date(d).getTime() >= start;
    const rangeSessions = sessions.filter((s) => inRange(s.completedAt));
    const series = e1rmSeries(sessions).filter((p) => inRange(p.date));
    const origin = series.length ? new Date(series[0].date).getTime() : 0;
    const fit = series.length >= 3 ? linearFit(series.map((p) => ({ x: new Date(p.date).getTime() - origin, y: p.e1rm }))) : null;
    const rangeSets = rangeSessions.flatMap((s) => s.sets);
    return {
      exercise,
      sessions,
      rangeSessions,
      series,
      volumeSeries: rangeSessions.map((s) => ({ workoutInstanceId: s.workoutInstanceId, date: s.completedAt, volume: volume(s.sets) })),
      records: sessions.length ? liftRecords(sessions) : EMPTY_RECORDS,
      matrix: weightRepMatrix(rangeSets),
      matrixCaption: matrixCaption(rangeSets),
      stalled: isStalled(series),
      trend: fit,
    };
  }, [exercise, range]);

  const refresh = useCallback(() => load(true), [load]);
  return { data, loading, error, refresh };
}
