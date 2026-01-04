export interface Exercise {
  id?: number;
  name: string;
  volume: number;
  category?: string;
  order?: number;
  volumeChange?: number;
  sets?: Array<{
    weight: number;
    reps: number;
    setNumber: number;
  }>;
}

export interface WorkoutIteration {
  iterationNumber: number;
  completedAt: string | null;
  exercises: Exercise[];
}

export interface PlanDay {
  dayNumber: number;
  isRestDay: boolean;
  workout: {
    id: number;
    name: string;
  };
  iterations: WorkoutIteration[];
}

export interface IterationVolume {
  iterationNumber: number;
  totalVolume: number;
}

export interface MesocycleProgressData {
  id: number;
  name: string;
  plan: {
    id: number;
    name: string;
  };
  planDays: PlanDay[];
  iterationVolumes?: IterationVolume[];
}

