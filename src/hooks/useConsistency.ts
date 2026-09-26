import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  adherence,
  dayHeatLevels,
  mesocycleDetailInput,
  sessionsPerWeek,
  weekStreak,
  type HeatLevel,
  type Session,
} from '../analytics';
import type { MesocycleDetail } from '../types/plan';
import { loadMesocycle } from './mesocycleData';
import { useTrainingHistory } from './useTrainingHistory';
import { runLimited, type HookResult } from './cache';

export interface ConsistencyData {
  /** Heat level for every day with a session, keyed "YYYY-MM-DD". */
  levels: Map<string, HeatLevel>;
  /** Sessions per day, keyed "YYYY-MM-DD", for tapping a day. */
  sessionsByDay: Map<string, Session[]>;
  streak: number;
  sessionsInYear: number;
  /** Sessions per week over the last 26 weeks. */
  sessionsPerWeek26: number | null;
  /** Planned days hit across mesocycles with sessions in the year. */
  adherence: { done: number; due: number; rate: number | null };
  /** Years with at least one completed session, newest first. */
  years: number[];
}

/** Heat levels, streak, sessions per week and adherence for the History tab and the Consistency screen. */
export function useConsistency(year: number): HookResult<ConsistencyData> {
  const history = useTrainingHistory();
  const { sessions } = history.data;
  const [mesoDetails, setMesoDetails] = useState<MesocycleDetail[]>([]);

  const mesoIds = useMemo(
    () =>
      [
        ...new Set(
          sessions
            .filter((s) => s.planned && s.mesocycleId != null && new Date(s.completedAt).getFullYear() === year)
            .map((s) => s.mesocycleId as number),
        ),
      ],
    [sessions, year],
  );

  const loadDetails = useCallback(
    async (force: boolean) => {
      const results = await runLimited(mesoIds.map((id) => () => loadMesocycle(id, force)), 4);
      setMesoDetails(results.filter((d): d is MesocycleDetail => !!d));
    },
    [mesoIds],
  );

  useEffect(() => {
    loadDetails(false);
  }, [loadDetails]);

  const data = useMemo<ConsistencyData>(() => {
    const today = new Date();
    const sessionsByDay = new Map<string, Session[]>();
    for (const s of sessions) {
      const d = new Date(s.completedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const list = sessionsByDay.get(key) ?? [];
      list.push(s);
      sessionsByDay.set(key, list);
    }
    let done = 0;
    let due = 0;
    for (const d of mesoDetails) {
      const a = adherence(mesocycleDetailInput(d));
      done += a.done;
      due += a.due;
    }
    const years = [...new Set(sessions.map((s) => new Date(s.completedAt).getFullYear()))].sort((a, b) => b - a);
    return {
      levels: dayHeatLevels(sessions),
      sessionsByDay,
      streak: weekStreak(sessions, today),
      sessionsInYear: sessions.filter((s) => new Date(s.completedAt).getFullYear() === year).length,
      sessionsPerWeek26: sessionsPerWeek(sessions, addDays(today, -26 * 7), today),
      adherence: { done, due, rate: due > 0 ? done / due : null },
      years: years.length ? years : [today.getFullYear()],
    };
  }, [sessions, mesoDetails, year]);

  const refresh = useCallback(async () => {
    await history.refresh();
    await loadDetails(true);
  }, [history, loadDetails]);

  return { data, loading: history.loading, error: history.error, refresh };
}
