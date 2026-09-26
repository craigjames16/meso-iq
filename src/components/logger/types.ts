export type ClientSetType = 'REGULAR' | 'DROP_SET' | 'REST_PAUSE' | 'MYO_REP';
export type AttachedSetType = Exclude<ClientSetType, 'REGULAR'>;

export interface ExerciseSet {
  id?: number;
  reps: number;
  weight: number;
  /** Main set number (1, 2, 3, …). Attached sets share their parent's number. */
  setNumber?: number;
  /** Null for main sets; 1, 2, 3 for attached sets. */
  subSetNumber?: number | null;
  setType?: ClientSetType;
  completed?: boolean;
  loading?: boolean;
  lastSet?: {
    reps: number;
    weight: number;
    setNumber: number;
  } | null;
}

export interface HistorySet {
  weight: number;
  reps: number;
  setNumber: number;
  subSetNumber?: number | null;
  setType?: ClientSetType;
}

export interface HistoryInstance {
  workoutInstanceId: number | string;
  volume: number;
  completedAt: string | Date;
  sets: HistorySet[];
}

export interface ExerciseTracking {
  exerciseId: number;
  exerciseName: string;
  order: number;
  sets: ExerciseSet[];
  history?: HistoryInstance[];
  mesocycleHistory?: HistoryInstance[];
}
