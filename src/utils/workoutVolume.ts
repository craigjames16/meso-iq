import type { WorkoutInstance } from '../types/workout';

export function getVolumeForInstance(instance: WorkoutInstance): number {
  if (instance.exerciseSets && instance.exerciseSets.length > 0) {
    return instance.exerciseSets.reduce(
      (total: number, set: { weight: number; reps: number }) =>
        total + set.weight * set.reps,
      0
    );
  }
  if (instance.workoutExercises && instance.workoutExercises.length > 0) {
    return (instance.workoutExercises as Array<{
      sets?: Array<{ weight?: number; reps?: number }>;
    }>).reduce(
      (total, we) =>
        total +
        (we.sets || []).reduce(
          (s, set) => s + (set.weight || 0) * (set.reps || 0),
          0
        ),
      0
    );
  }
  return 0;
}

export interface ExerciseVolumeRow {
  exerciseId: number;
  exerciseName: string;
  setCount: number;
  volume: number;
}

/**
 * Per-exercise volume and set counts, preserving first-seen exercise order.
 */
export function getExerciseVolumeBreakdown(
  instance: WorkoutInstance
): ExerciseVolumeRow[] {
  if (instance.exerciseSets && instance.exerciseSets.length > 0) {
    const rows: ExerciseVolumeRow[] = [];
    const idToIndex = new Map<number, number>();
    for (const set of instance.exerciseSets) {
      const v = set.weight * set.reps;
      const i = idToIndex.get(set.exerciseId);
      if (i !== undefined) {
        rows[i].setCount += 1;
        rows[i].volume += v;
      } else {
        idToIndex.set(set.exerciseId, rows.length);
        rows.push({
          exerciseId: set.exerciseId,
          exerciseName: set.exercise?.name ?? 'Exercise',
          setCount: 1,
          volume: v,
        });
      }
    }
    return rows;
  }

  const wes = (instance.workoutExercises || []) as Array<{
    exerciseId: number;
    exercise?: { name?: string };
    sets?: Array<{ weight?: number; reps?: number }>;
  }>;

  return wes.map((we) => {
    const sets = we.sets || [];
    const volume = sets.reduce(
      (s, st) => s + (st.weight || 0) * (st.reps || 0),
      0
    );
    return {
      exerciseId: we.exerciseId,
      exerciseName: we.exercise?.name ?? 'Exercise',
      setCount: sets.length,
      volume,
    };
  });
}
