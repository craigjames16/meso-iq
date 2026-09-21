// Turns service responses into analytics types. This is the only file in
// src/analytics that imports from src/types or src/services.
import type { WorkoutInstance } from '../types/workout';
import type { ExerciseDetailResponse } from '../services/exercisesService';
import type { ExercisesByCategory, MesocycleDetail } from '../types/plan';
import { ALL_MUSCLES } from './types';
import type {
  ExerciseSession,
  MesocycleDetailInput,
  MesocycleProgressInput,
  Muscle,
  MuscleOf,
  Session,
  SetRecord,
  SetType,
} from './types';

const SET_TYPES: readonly SetType[] = ['REGULAR', 'DROP_SET', 'REST_PAUSE', 'MYO_REP'];

export function toMuscle(category: string | null | undefined): Muscle | undefined {
  if (!category) return undefined;
  const upper = category.toUpperCase() as Muscle;
  return ALL_MUSCLES.includes(upper) ? upper : undefined;
}

function toSetType(value: unknown): SetType | undefined {
  return typeof value === 'string' && (SET_TYPES as readonly string[]).includes(value) ? (value as SetType) : undefined;
}

function toSetRecord(raw: {
  exerciseId: number;
  weight: number;
  reps: number;
  setNumber: number;
  subSetNumber?: number | null;
  setType?: unknown;
}): SetRecord {
  return {
    exerciseId: raw.exerciseId,
    weight: Number(raw.weight) || 0,
    reps: Number(raw.reps) || 0,
    setNumber: raw.setNumber,
    subSetNumber: raw.subSetNumber ?? null,
    setType: toSetType(raw.setType),
  };
}

/** One completed workout instance from history or GET /api/workout-instances/:id. */
export function sessionFromInstance(instance: WorkoutInstance): Session | null {
  if (!instance.completedAt) return null;
  const pid = instance.planInstanceDays?.[0];
  const names: Record<number, string> = {};
  const sets: SetRecord[] = (instance.exerciseSets ?? []).map((s) => {
    if (s.exercise?.name) names[s.exerciseId] = s.exercise.name;
    return toSetRecord(s);
  });
  const order = [...(instance.workoutExercises ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((we) => {
      if (we.exercise?.name) names[we.exerciseId] = we.exercise.name;
      return we.exerciseId;
    });
  return {
    workoutInstanceId: instance.id,
    workoutId: instance.workoutId ?? instance.workout?.id,
    workoutName: instance.workout?.name ?? 'Workout',
    completedAt: instance.completedAt,
    sets,
    planned: !!pid,
    mesocycleId: pid?.planInstance?.mesocycle?.id ?? instance.mesocycleId ?? null,
    mesocycleName: pid?.planInstance?.mesocycle?.name ?? null,
    planName: pid?.planInstance?.plan?.name ?? null,
    iteration: pid?.planInstance?.iterationNumber ?? null,
    rir: pid?.planInstance?.rir ?? null,
    exerciseNames: names,
    exerciseOrder: order,
  };
}

/** Completed sessions from training history, oldest first. */
export function sessionsFromHistory(instances: WorkoutInstance[]): Session[] {
  return instances
    .map(sessionFromInstance)
    .filter((s): s is Session => s != null)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
}

/** Muscle lookup from the categories that history sets carry. */
export function muscleMapFromHistory(instances: WorkoutInstance[]): Map<number, Muscle> {
  const map = new Map<number, Muscle>();
  for (const i of instances) {
    for (const s of i.exerciseSets ?? []) {
      const m = toMuscle(s.exercise?.category);
      if (m) map.set(s.exerciseId, m);
    }
    for (const we of i.workoutExercises ?? []) {
      const m = toMuscle(we.exercise?.category);
      if (m) map.set(we.exerciseId, m);
    }
  }
  return map;
}

/** Muscle lookup from GET /api/exercises, which groups exercises by category. */
export function muscleMapFromExercises(byCategory: ExercisesByCategory): Map<number, Muscle> {
  const map = new Map<number, Muscle>();
  for (const [category, list] of Object.entries(byCategory ?? {})) {
    if (!Array.isArray(list)) continue;
    for (const ex of list) {
      const m = toMuscle(ex.category || category);
      if (m) map.set(ex.id, m);
    }
  }
  return map;
}

export function muscleOfFrom(...maps: Map<number, Muscle>[]): MuscleOf {
  return (id: number) => {
    for (const map of maps) {
      const m = map.get(id);
      if (m) return m;
    }
    return undefined;
  };
}

/** Sessions for one exercise from GET /api/exercises/:id. */
export function exerciseSessionsFromDetail(detail: Pick<ExerciseDetailResponse, 'id' | 'history'>): ExerciseSession[] {
  return (detail.history ?? [])
    .filter((h) => h.completedAt != null)
    .map((h) => ({
      workoutInstanceId: h.workoutInstanceId,
      completedAt: h.completedAt as string,
      sets: (h.sets ?? []).map((s) => toSetRecord({ ...s, exerciseId: detail.id })),
    }))
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
}

/** Sessions for one exercise, cut from training history. */
export function exerciseSessionsFromHistory(sessions: Session[], exerciseId: number): ExerciseSession[] {
  return sessions
    .map((s) => ({
      workoutInstanceId: s.workoutInstanceId,
      completedAt: s.completedAt,
      sets: s.sets.filter((set) => set.exerciseId === exerciseId),
    }))
    .filter((s) => s.sets.length > 0);
}

/** A mesocycle's completed sessions, tagged with their week. */
export function cycleProgressFromSessions(sessions: Session[], mesocycleId: number): MesocycleProgressInput {
  return {
    sessions: sessions
      .filter((s) => s.planned && s.mesocycleId === mesocycleId && s.iteration != null)
      .map((s) => ({ iteration: s.iteration as number, completedAt: s.completedAt, sets: s.sets })),
  };
}

export function mesocycleDetailInput(detail: MesocycleDetail): MesocycleDetailInput {
  return {
    weeks: (detail.instances ?? []).map((inst) => ({
      iterationNumber: inst.iterationNumber,
      rir: inst.rir ?? null,
      status: inst.status ?? null,
      days: (inst.days ?? []).map((d) => ({
        dayNumber: d.planDay?.dayNumber ?? 0,
        isRestDay: !!d.planDay?.isRestDay,
        isComplete: !!d.isComplete,
        workoutInstanceId: d.workoutInstance?.id ?? null,
        completedAt: d.workoutInstance?.completedAt ?? null,
      })),
    })),
  };
}
