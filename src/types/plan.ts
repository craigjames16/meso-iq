export interface WorkoutExercise {
  id: number;
  order: number;
  exercise: {
    id: number;
    name: string;
    category: string;
  };
}

export interface PlanDay {
  id: number;
  dayNumber: number;
  isRestDay: boolean;
  workout?: {
    id: number;
    name: string;
    workoutExercises: WorkoutExercise[];
  };
}

export interface Plan {
  id: number;
  name: string;
  days: PlanDay[];
  instances?: Array<{
    status: string | null;
  }>;
}

export interface MesocycleListItem {
  id: number;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | null;
  iterations: number;
  plan: {
    id: number;
    name: string;
  };
}

export interface ExerciseListItem {
  id: number;
  name: string;
  category: string;
  highestWeight: number;
  workoutInstances?: Array<{
    workoutInstanceId: number;
    volume: number;
    completedAt: string | null;
    sets: Array<{
      weight: number;
      reps: number;
      setNumber: number;
    }>;
  }>;
}

export type ExercisesByCategory = {
  [key: string]: ExerciseListItem[];
};

// Mesocycle Detail Types
export interface PlanInstanceDay {
  id: number;
  isComplete: boolean;
  planDay: {
    isRestDay: boolean;
    dayNumber: number;
  };
  workoutInstance: {
    id: number;
    completedAt: string | null;
  } | null;
}

export interface PlanInstance {
  id: number;
  status: string | null;
  iterationNumber: number;
  rir: number;
  completedAt: string | null;
  days: PlanInstanceDay[];
}

export interface MesocycleDetail {
  id: number;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | null;
  iterations: number;
  startedAt: string;
  completedAt: string | null;
  plan: { id: number; name: string };
  instances: PlanInstance[];
}

