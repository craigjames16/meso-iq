// Shared types for the analytics layer. Nothing in src/analytics imports
// from src/types or src/services except adapters.ts.

export type SetType = 'REGULAR' | 'DROP_SET' | 'REST_PAUSE' | 'MYO_REP';
export type Muscle = 'BACK' | 'BICEPS' | 'CALVES' | 'CHEST' | 'HAMSTRINGS' | 'QUADS' | 'SHOULDERS' | 'TRICEPS';

export const ALL_MUSCLES: readonly Muscle[] = [
  'BACK',
  'BICEPS',
  'CALVES',
  'CHEST',
  'HAMSTRINGS',
  'QUADS',
  'SHOULDERS',
  'TRICEPS',
];

export type MuscleOf = (exerciseId: number) => Muscle | undefined;

export interface SetRecord {
  exerciseId: number;
  weight: number;
  reps: number;
  setNumber: number;
  subSetNumber?: number | null;
  setType?: SetType;
}

/** One completed workout instance. */
export interface Session {
  workoutInstanceId: number;
  /** The workout template; the same for every "Push" session. */
  workoutId: number;
  workoutName: string;
  /** ISO date. */
  completedAt: string;
  sets: SetRecord[];
  /** False for off-plan sessions. */
  planned: boolean;
  mesocycleId?: number | null;
  mesocycleName?: string | null;
  planName?: string | null;
  /** The plan instance's week number within its mesocycle. */
  iteration?: number | null;
  rir?: number | null;
  /** Exercise names keyed by id, when the source carries them. */
  exerciseNames?: Record<number, string>;
  /** Exercise order within the session, when known. */
  exerciseOrder?: number[];
}

/** One exercise within one session. */
export interface ExerciseSession {
  workoutInstanceId: number;
  completedAt: string;
  sets: SetRecord[];
}

export interface SeriesPoint {
  workoutInstanceId: number;
  date: string;
  e1rm: number;
  /** The top set. */
  weight: number;
  reps: number;
  isPR: boolean;
}

/** Completed planned sessions of one mesocycle, tagged with their week. */
export interface MesocycleProgressInput {
  sessions: { iteration: number; completedAt: string; sets: SetRecord[] }[];
}

export interface MesocycleDayInput {
  dayNumber: number;
  isRestDay: boolean;
  isComplete: boolean;
  workoutInstanceId: number | null;
  completedAt: string | null;
}

export interface MesocycleWeekInput {
  iterationNumber: number;
  rir: number | null;
  status: string | null;
  days: MesocycleDayInput[];
}

export interface MesocycleDetailInput {
  weeks: MesocycleWeekInput[];
}
