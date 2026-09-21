import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adherence,
  cycleE1rmDelta,
  cycleProgressFromSessions,
  cycleRadar,
  e1rmSeries,
  exerciseSessionsFromHistory,
  fastestRiser,
  isHardSet,
  isStalled,
  mesocycleDetailInput,
  muscleOverloadRate,
  volume,
  type Muscle,
  type SeriesPoint,
  type Session,
} from '../analytics';
import type { MesocycleDetail, MesocycleListItem } from '../types/plan';
import { cachedMesocycle, cachedMesocycles, loadMesocycle, loadMesocycles, subscribeMesocycles } from './mesocycleData';
import { useTrainingHistory } from './useTrainingHistory';
import { errorMessage, type HookResult } from './cache';

export type DayState = 'done' | 'missed' | 'upcoming' | 'rest';

export interface CycleDay {
  dayNumber: number;
  isRestDay: boolean;
  state: DayState;
  workoutInstanceId: number | null;
  workoutName: string | null;
  completedAt: string | null;
}

export interface CycleWeek {
  iteration: number;
  rir: number | null;
  status: string | null;
  tonnage: number;
  isCurrent: boolean;
  days: CycleDay[];
}

export interface StrengthRow {
  exerciseId: number;
  name: string;
  muscle: Muscle | undefined;
  series: SeriesPoint[];
  current: number | null;
  delta: number | null;
  stalled: boolean;
  /** Hard sets for this lift rose across the stalled sessions. */
  setsRising: boolean;
  /** Sessions the e1RM has been flat for, when stalled. */
  flatSessions: number;
}

export interface CycleStats {
  detail: MesocycleDetail | null;
  mesocycles: MesocycleListItem[];
  currentWeek: number;
  currentRir: number | null;
  daysLogged: number;
  daysTotal: number;
  adherence: { done: number; due: number; rate: number | null };
  weeks: CycleWeek[];
  e1rmDelta: { average: number | null; byExercise: { exerciseId: number; delta: number }[] };
  strength: StrengthRow[];
  stalls: StrengthRow[];
  fastestRiser: { muscle: Muscle; rate: number; exerciseCount: number } | null;
  radar: ReturnType<typeof cycleRadar> | null;
  previous: MesocycleListItem | null;
  /** This cycle's completed planned sessions. */
  sessions: Session[];
  /** Completed sessions for this cycle, keyed by workout instance id. */
  sessionById: Map<number, Session>;
}

const STALL_WINDOW = 3;

function dayStates(detail: MesocycleDetail): Map<string, DayState> {
  const input = mesocycleDetailInput(detail);
  const weeks = [...input.weeks].sort((a, b) => a.iterationNumber - b.iterationNumber);
  const isDone = (d: { isComplete: boolean; completedAt: string | null }) => d.completedAt != null || d.isComplete;
  let currentIndex = -1;
  weeks.forEach((w, i) => {
    if (w.days.some((d) => !d.isRestDay && isDone(d))) currentIndex = i;
  });
  const out = new Map<string, DayState>();
  weeks.forEach((w, i) => {
    const highest = Math.max(0, ...w.days.filter((d) => !d.isRestDay && isDone(d)).map((d) => d.dayNumber));
    for (const d of w.days) {
      const key = `${w.iterationNumber}-${d.dayNumber}`;
      if (d.isRestDay) out.set(key, isDone(d) ? 'done' : 'rest');
      else if (isDone(d)) out.set(key, 'done');
      else if (w.status === 'COMPLETE' || i < currentIndex || (i === currentIndex && d.dayNumber < highest)) out.set(key, 'missed');
      else out.set(key, 'upcoming');
    }
  });
  return out;
}

/** Everything the Cycle tab, the active cycle card and Mesocycle detail show for one mesocycle. */
export function useCycleStats(mesocycleId: number | null): HookResult<CycleStats> {
  const history = useTrainingHistory();
  const [detail, setDetail] = useState<MesocycleDetail | null>(() =>
    mesocycleId != null ? cachedMesocycle(mesocycleId) ?? null : null,
  );
  const [mesocycles, setMesocycles] = useState<MesocycleListItem[]>(() => cachedMesocycles() ?? []);
  const [loading, setLoading] = useState(mesocycleId != null && !detail);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      if (mesocycleId == null) {
        setDetail(null);
        setLoading(false);
        return;
      }
      const cached = cachedMesocycle(mesocycleId);
      if (cached) setDetail(cached);
      setLoading(!cached || force);
      setError(null);
      try {
        const [d, list] = await Promise.all([loadMesocycle(mesocycleId, force), loadMesocycles(force)]);
        setDetail(d);
        setMesocycles(list);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [mesocycleId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(
    () =>
      subscribeMesocycles(() => {
        if (mesocycleId != null) {
          const cached = cachedMesocycle(mesocycleId);
          if (cached) setDetail(cached);
        }
        const list = cachedMesocycles();
        if (list) setMesocycles(list);
      }),
    [mesocycleId],
  );

  const { sessions: allSessions, muscleOf } = history.data;

  const data = useMemo<CycleStats>(() => {
    const sessions = mesocycleId != null ? allSessions.filter((s) => s.planned && s.mesocycleId === mesocycleId) : [];
    const sessionById = new Map(sessions.map((s) => [s.workoutInstanceId, s]));
    const progress = mesocycleId != null ? cycleProgressFromSessions(allSessions, mesocycleId) : { sessions: [] };

    const empty: CycleStats = {
      detail,
      mesocycles,
      currentWeek: 1,
      currentRir: null,
      daysLogged: 0,
      daysTotal: 0,
      adherence: { done: 0, due: 0, rate: null },
      weeks: [],
      e1rmDelta: { average: null, byExercise: [] },
      strength: [],
      stalls: [],
      fastestRiser: null,
      radar: null,
      previous: null,
      sessions,
      sessionById,
    };
    if (!detail) return empty;

    const instances = [...(detail.instances ?? [])].sort((a, b) => a.iterationNumber - b.iterationNumber);
    const current =
      instances.find((i) => i.status === 'IN_PROGRESS') ??
      instances.find((i) => i.status !== 'COMPLETE') ??
      instances[instances.length - 1];
    const currentWeek = current?.iterationNumber ?? 1;
    const states = dayStates(detail);

    const weeks: CycleWeek[] = instances.map((inst) => ({
      iteration: inst.iterationNumber,
      rir: inst.rir ?? null,
      status: inst.status ?? null,
      tonnage: sessions.filter((s) => s.iteration === inst.iterationNumber).reduce((t, s) => t + volume(s.sets), 0),
      isCurrent: detail.status !== 'COMPLETE' && inst.iterationNumber === currentWeek,
      days: [...(inst.days ?? [])]
        .sort((a, b) => a.planDay.dayNumber - b.planDay.dayNumber)
        .map((d) => {
          const wi = d.workoutInstance;
          const s = wi ? sessionById.get(wi.id) : undefined;
          return {
            dayNumber: d.planDay.dayNumber,
            isRestDay: d.planDay.isRestDay,
            state: states.get(`${inst.iterationNumber}-${d.planDay.dayNumber}`) ?? 'upcoming',
            workoutInstanceId: wi?.id ?? null,
            workoutName: s?.workoutName ?? null,
            completedAt: wi?.completedAt ?? null,
          };
        }),
    }));

    const trainingDays = weeks.flatMap((w) => w.days.filter((d) => !d.isRestDay));
    const daysLogged = trainingDays.filter((d) => d.state === 'done').length;

    // Strength trend: one row per exercise logged in this cycle.
    const exerciseIds = [...new Set(sessions.flatMap((s) => s.sets.map((set) => set.exerciseId)))];
    const names = new Map<number, string>();
    for (const s of sessions) for (const [id, n] of Object.entries(s.exerciseNames ?? {})) names.set(Number(id), n);

    const strength: StrengthRow[] = exerciseIds
      .map((id) => {
        const exSessions = exerciseSessionsFromHistory(sessions, id);
        const series = e1rmSeries(exSessions);
        const first = series[0]?.e1rm ?? null;
        const last = series[series.length - 1]?.e1rm ?? null;
        const stalled = isStalled(series, { window: STALL_WINDOW });
        const windowSessions = exSessions.slice(-STALL_WINDOW);
        const hard = (i: number) => windowSessions[i]?.sets.filter(isHardSet).length ?? 0;
        return {
          exerciseId: id,
          name: names.get(id) ?? 'Exercise',
          muscle: muscleOf(id),
          series,
          current: last,
          delta: series.length >= 2 && first ? (last! - first) / first : null,
          stalled,
          setsRising: windowSessions.length >= 2 && hard(windowSessions.length - 1) > hard(0),
          flatSessions: stalled ? STALL_WINDOW : 0,
        };
      })
      .filter((r) => r.series.length > 0)
      .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

    const start = detail.startedAt ? new Date(detail.startedAt) : new Date(0);
    const end = detail.completedAt ? new Date(detail.completedAt) : new Date();
    const byMuscle: Partial<Record<Muscle, number | null>> = {};
    const countByMuscle: Partial<Record<Muscle, number>> = {};
    const muscles = [...new Set(strength.map((r) => r.muscle).filter((m): m is Muscle => !!m))];
    for (const m of muscles) {
      const rows = strength.filter((r) => r.muscle === m);
      byMuscle[m] = muscleOverloadRate(rows, start, end);
      countByMuscle[m] = rows.filter((r) => r.series.length >= 3).length;
    }
    const riser = fastestRiser(byMuscle);

    const previous =
      [...mesocycles].filter((m) => m.id < detail.id).sort((a, b) => b.id - a.id)[0] ?? null;
    const previousProgress = previous ? cycleProgressFromSessions(allSessions, previous.id) : null;
    const radar =
      previousProgress && previousProgress.sessions.length > 0
        ? cycleRadar(progress, previousProgress, currentWeek, muscleOf)
        : null;

    return {
      ...empty,
      currentWeek,
      currentRir: current?.rir ?? null,
      daysLogged,
      daysTotal: trainingDays.length,
      adherence: adherence(mesocycleDetailInput(detail)),
      weeks,
      e1rmDelta: cycleE1rmDelta(progress),
      strength,
      stalls: strength.filter((r) => r.stalled),
      fastestRiser: riser ? { ...riser, exerciseCount: countByMuscle[riser.muscle] ?? 0 } : null,
      radar,
      previous,
    };
  }, [detail, mesocycles, mesocycleId, allSessions, muscleOf]);

  const refresh = useCallback(async () => {
    await Promise.all([load(true), history.refresh()]);
  }, [load, history]);

  return {
    data,
    loading: loading || history.loading,
    error: error ?? history.error,
    refresh,
  };
}
