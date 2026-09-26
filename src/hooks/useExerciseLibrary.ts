import { useCallback, useEffect, useMemo, useState } from 'react';
import { exercisesService } from '../services/exercisesService';
import type { ExercisesByCategory } from '../types/plan';
import { toMuscle, type Muscle } from '../analytics';
import { ResourceCache, errorMessage, type HookResult } from './cache';

export interface LibraryExercise {
  id: number;
  name: string;
  category: string;
  muscle: Muscle | undefined;
  /** True for the user's own exercises; false for the shared library. */
  custom: boolean;
}

const cache = new ResourceCache<LibraryExercise[]>();
const KEY = 'all';

function flatten(byCategory: ExercisesByCategory): LibraryExercise[] {
  const out: LibraryExercise[] = [];
  for (const [category, list] of Object.entries(byCategory ?? {})) {
    if (!Array.isArray(list)) continue;
    for (const ex of list as Array<{ id: number; name: string; category?: string; userId?: string | null }>) {
      const cat = (ex.category || category || '').toUpperCase();
      out.push({ id: ex.id, name: ex.name, category: cat, muscle: toMuscle(cat), custom: ex.userId != null });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadExerciseLibrary(force = false): Promise<LibraryExercise[]> {
  return cache.load(KEY, async () => flatten(await exercisesService.getExercises()), force);
}

export function invalidateExerciseLibrary(): void {
  cache.delete(KEY);
}

/** The exercise list from GET /api/exercises, flattened and cached for the session. */
export function useExerciseLibrary(): HookResult<{ exercises: LibraryExercise[]; byId: Map<number, LibraryExercise> }> {
  const [exercises, setExercises] = useState<LibraryExercise[]>(() => cache.get(KEY) ?? []);
  const [loading, setLoading] = useState(!cache.has(KEY));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => cache.subscribe(() => setExercises(cache.get(KEY) ?? [])), []);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      setExercises(await loadExerciseLibrary(force));
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
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  return { data: { exercises, byId }, loading, error, refresh };
}
