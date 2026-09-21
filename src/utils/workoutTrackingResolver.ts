import type { ExerciseTracking, ExerciseSet } from '../components/ExerciseTrackingCard';
import type { HistoryInstance } from '../components/ExerciseHistoryModal';

/** Per-exercise data from GET /exercises/:id (normalized for UI). */
export interface ExerciseDetailData {
  history: HistoryInstance[];
  lastVolume: number | null;
  lastSets: Array<{
    setNumber: number;
    reps: number;
    weight: number;
    subSetNumber?: number | null;
    setType?: 'REGULAR' | 'DROP_SET' | 'MYO_REP';
  }>;
}

function mapApiSetToCompleted(set: any): ExerciseSet {
  return {
    id: set.id,
    reps: set.reps,
    weight: set.weight,
    setNumber: set.setNumber,
    subSetNumber: set.subSetNumber ?? null,
    setType: set.setType || 'REGULAR',
    completed: true,
  };
}

function defaultTwoSets(): ExerciseSet[] {
  return [
    { reps: 0, weight: 0, setNumber: 1, subSetNumber: null, setType: 'REGULAR', completed: false },
    { reps: 0, weight: 0, setNumber: 2, subSetNumber: null, setType: 'REGULAR', completed: false },
  ];
}

/**
 * Merge completed sets from the current workout instance with the template from last history.
 */
function mergeIncompleteExerciseSets(
  nestedSets: any[],
  historyTemplate: ExerciseDetailData['lastSets']
): ExerciseSet[] {
  const nested = nestedSets.map(mapApiSetToCompleted);
  const usedIds = new Set<number>();

  if (!historyTemplate || historyTemplate.length === 0) {
    if (nested.length === 0) {
      return defaultTwoSets();
    }
    return nested.map((s) => ({ ...s, completed: true }));
  }

  const result: ExerciseSet[] = [];

  for (const h of historyTemplate) {
    const matchIdx = nested.findIndex((n) => {
      if (n.id == null || usedIds.has(n.id)) return false;
      return (
        n.setNumber === h.setNumber &&
        (n.subSetNumber ?? null) === (h.subSetNumber ?? null)
      );
    });

    if (matchIdx >= 0) {
      const n = nested[matchIdx];
      usedIds.add(n.id!);
      result.push({
        ...n,
        completed: true,
        lastSet: {
          reps: h.reps,
          weight: h.weight,
          setNumber: h.setNumber,
        },
      });
    } else {
      result.push({
        reps: 0,
        weight: 0,
        setNumber: h.setNumber,
        subSetNumber: h.subSetNumber ?? null,
        setType: h.setType || 'REGULAR',
        completed: false,
        lastSet: {
          reps: h.reps,
          weight: h.weight,
          setNumber: h.setNumber,
        },
      });
    }
  }

  for (const n of nested) {
    if (n.id != null && !usedIds.has(n.id)) {
      usedIds.add(n.id);
      result.push({
        ...n,
        completed: true,
      });
    }
  }

  return result;
}

const emptyDetailFallback: ExerciseDetailData = {
  history: [],
  lastVolume: null,
  lastSets: [],
};

/** One row of exercise tracking from a nested workoutExercise + history detail (e.g. after add-exercise). */
export function buildExerciseTrackingForWorkoutExercise(
  workoutExercise: any,
  isWorkoutCompleted: boolean,
  exerciseDetailById: Record<number, ExerciseDetailData>
): ExerciseTracking {
  const exerciseId = workoutExercise.exercise?.id ?? workoutExercise.exerciseId;
  const exerciseName = workoutExercise.exercise?.name ?? '';
  const order = workoutExercise.order ?? 0;
  const nestedSets = workoutExercise.sets ?? [];
  const detail = exerciseDetailById[exerciseId] ?? emptyDetailFallback;
  const history = detail.history ?? [];
  const lastSetsTemplate = detail.lastSets ?? [];

  let sets: ExerciseSet[];

  if (isWorkoutCompleted) {
    sets = nestedSets.map((set: any) => ({
      id: set.id,
      reps: set.reps,
      weight: set.weight,
      setNumber: set.setNumber,
      subSetNumber: set.subSetNumber ?? null,
      setType: set.setType || 'REGULAR',
      completed: true,
    }));
  } else {
    sets = mergeIncompleteExerciseSets(nestedSets, lastSetsTemplate);
  }

  return {
    exerciseId,
    exerciseName,
    order,
    sets,
    history,
  };
}

/**
 * Build exercise trackings and set rows from the workout instance + per-exercise history/detail.
 */
export function resolveWorkoutTrackings(
  workoutInstance: any,
  exerciseDetailById: Record<number, ExerciseDetailData>
): ExerciseTracking[] {
  const workoutExercises = workoutInstance.workoutExercises ?? [];
  const isWorkoutCompleted = !!workoutInstance.completedAt;

  const trackings: ExerciseTracking[] = workoutExercises.map((workoutExercise: any) =>
    buildExerciseTrackingForWorkoutExercise(
      workoutExercise,
      isWorkoutCompleted,
      exerciseDetailById
    )
  );

  return trackings.sort((a, b) => a.order - b.order);
}
