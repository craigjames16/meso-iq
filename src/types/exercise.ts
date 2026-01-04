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

