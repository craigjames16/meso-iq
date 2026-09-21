import { useCallback, useEffect, useState } from 'react';
import { plansService } from '../services/plansService';
import type { Plan } from '../types/plan';
import { ResourceCache, errorMessage, type HookResult } from './cache';

const cache = new ResourceCache<Plan[]>();
const KEY = 'all';

export function loadPlans(force = false): Promise<Plan[]> {
  return cache.load(KEY, () => plansService.getPlans(), force);
}

export function invalidatePlans(): void {
  cache.delete(KEY);
}

/** Every program from GET /api/plans, cached for the session. */
export function usePlans(): HookResult<Plan[]> {
  const [plans, setPlans] = useState<Plan[]>(() => cache.get(KEY) ?? []);
  const [loading, setLoading] = useState(!cache.has(KEY));
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      cache.subscribe(() => {
        const v = cache.get(KEY);
        if (v) setPlans(v);
        else loadPlans().then(setPlans).catch(() => undefined);
      }),
    [],
  );

  const load = useCallback(async (force: boolean) => {
    setLoading(!cache.has(KEY) || force);
    setError(null);
    try {
      setPlans(await loadPlans(force));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  return { data: plans, loading, error, refresh };
}
