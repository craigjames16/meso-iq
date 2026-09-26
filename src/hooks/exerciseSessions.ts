import { exercisesService } from '../services/exercisesService';
import { exerciseSessionsFromDetail, toMuscle, type ExerciseSession, type Muscle } from '../analytics';
import { ResourceCache } from './cache';

export interface ExerciseHistory {
  id: number;
  name: string;
  category: string;
  muscle: Muscle | undefined;
  sessions: ExerciseSession[];
}

const cache = new ResourceCache<ExerciseHistory>();

/** GET /api/exercises/:id, adapted and cached for the session. */
export function loadExerciseHistory(id: number, force = false): Promise<ExerciseHistory> {
  return cache.load(
    String(id),
    async () => {
      const detail = await exercisesService.getExercise(id);
      return {
        id,
        name: detail.name,
        category: (detail.category ?? '').toUpperCase(),
        muscle: toMuscle(detail.category),
        sessions: exerciseSessionsFromDetail({ id, history: detail.history ?? [] }),
      };
    },
    force,
  );
}

export function cachedExerciseHistory(id: number): ExerciseHistory | undefined {
  return cache.get(String(id));
}

/** Drop cached histories, for example after a workout is completed or an exercise renamed. */
export function invalidateExerciseHistory(id?: number): void {
  if (id == null) cache.clear();
  else cache.delete(String(id));
}
