import { useCallback, useEffect, useMemo, useState } from 'react';
import { adherence, cycleE1rmDelta, cycleProgressFromSessions, mesocycleDetailInput } from '../analytics';
import type { MesocycleDetail, MesocycleListItem } from '../types/plan';
import { cachedMesocycle, cachedMesocycles, loadMesocycle, loadMesocycles, subscribeMesocycles } from './mesocycleData';
import { useTrainingHistory } from './useTrainingHistory';
import { errorMessage, runLimited, type HookResult } from './cache';

export interface MesocycleSummary {
  id: number;
  name: string;
  planId: number;
  planName: string;
  status: MesocycleListItem['status'];
  iterations: number;
  startedAt: string | null;
  completedAt: string | null;
  daysLogged: number;
  daysTotal: number;
  adherence: number | null;
  /** Unweighted mean e1RM change across exercises logged in two or more weeks. */
  avgE1rm: number | null;
  /** Completed planned sessions in this cycle. */
  sessionCount: number;
}

/** Every mesocycle, newest first, with dates, days logged, adherence and avg e1RM. */
export function useMesocycleSummaries(): HookResult<MesocycleSummary[]> {
  const history = useTrainingHistory();
  const [list, setList] = useState<MesocycleListItem[]>(() => cachedMesocycles() ?? []);
  const [details, setDetails] = useState<Map<number, MesocycleDetail>>(() => new Map());
  const [loading, setLoading] = useState(!cachedMesocycles());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const items = await loadMesocycles(force);
      setList(items);
      const results = await runLimited(items.map((m) => () => loadMesocycle(m.id, force)), 4);
      setDetails(new Map(results.filter((d): d is MesocycleDetail => !!d).map((d) => [d.id, d])));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(
    () =>
      subscribeMesocycles(() => {
        const items = cachedMesocycles();
        if (!items) {
          load(false);
          return;
        }
        setList(items);
        setDetails((prev) => {
          const next = new Map(prev);
          for (const m of items) {
            const d = cachedMesocycle(m.id);
            if (d) next.set(m.id, d);
          }
          return next;
        });
      }),
    [load],
  );

  const { sessions } = history.data;
  const data = useMemo<MesocycleSummary[]>(
    () =>
      [...list]
        .sort((a, b) => b.id - a.id)
        .map((m) => {
          const d = details.get(m.id);
          const input = d ? mesocycleDetailInput(d) : null;
          const training = input ? input.weeks.flatMap((w) => w.days.filter((x) => !x.isRestDay)) : [];
          const progress = cycleProgressFromSessions(sessions, m.id);
          return {
            id: m.id,
            name: m.name,
            planId: m.plan?.id,
            planName: m.plan?.name ?? '',
            status: d?.status ?? m.status,
            iterations: m.iterations,
            startedAt: d?.startedAt ?? null,
            completedAt: d?.completedAt ?? null,
            daysLogged: training.filter((x) => x.completedAt != null || x.isComplete).length,
            daysTotal: training.length,
            adherence: input ? adherence(input).rate : null,
            avgE1rm: cycleE1rmDelta(progress).average,
            sessionCount: progress.sessions.length,
          };
        }),
    [list, details, sessions],
  );

  const refresh = useCallback(async () => {
    await Promise.all([load(true), history.refresh()]);
  }, [load, history]);

  return { data, loading: loading && list.length === 0, error, refresh };
}
