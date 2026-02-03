export interface ExercisePRs {
  maxWeight: number;
  maxReps: number;
  maxVolume: number;
}

export interface ExerciseVolumePoint {
  workoutInstanceId: number;
  date: string;
  volume: number;
  sets: number;
}

export interface ExerciseStat {
  id: number;
  name: string;
  category: string;
  totalSets: number;
  totalVolume: number;
  prs: ExercisePRs;
  lastPerformed: string | null;
  volumeProgression: ExerciseVolumePoint[];
}

export interface ExerciseStats {
  topExercises: ExerciseStat[];
  allExercises: ExerciseStat[];
}

export interface ExerciseSet {
  weight: number;
  reps: number;
  setNumber: number;
}

export interface HistoryInstance {
  workoutInstanceId: number;
  volume: number;
  completedAt: string | Date;
  sets: ExerciseSet[];
}

export interface ExerciseDetail {
  id: number;
  name: string;
  category: string;
  userId: string | null;
  prs: ExercisePRs;
  totalSets: number;
  totalVolume: number;
  lastPerformed: string | null;
  volumeProgression: ExerciseVolumePoint[];
  history: HistoryInstance[];
}

