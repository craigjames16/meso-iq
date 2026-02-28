export interface CurrentMesocycle {
  id: number;
  name: string;
  status: string;
  plan: {
    id: number;
    name: string;
  };
}

export interface PlanInstanceDay {
  id: number;
  planInstanceId: number;
  planDayId: number;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
  planDay: {
    id: number;
    isRestDay: boolean;
    dayNumber: number;
    workout?: {
      id: number;
      name: string;
    } | null;
  };
  workoutInstance: {
    id: number;
    completedAt: string | null;
    workout: {
      id: number;
      name: string;
    };
  } | null;
  planInstance: {
    id: number;
    iterationNumber: number | null;
    status: string | null;
    startedAt: string;
    completedAt: string | null;
  };
}

export interface HistoryData {
  workoutInstances: WorkoutInstance[];
}

export interface UpcomingData {
  upcomingDays: PlanInstanceDay[];
}

export interface ScheduleData {
  workoutInstances: WorkoutInstance[];
  upcomingDays: PlanInstanceDay[];
}

export interface WorkoutInstance {
  id: number;
  workoutId: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workout: {
    id: number;
    name: string;
  };
  exerciseSets?: Array<{
    id: number;
    exerciseId: number;
    setNumber: number;
    weight: number;
    reps: number;
    exercise: {
      id: number;
      name: string;
    };
  }>;
  workoutExercises?: Array<{
    id: number;
    exerciseId: number;
    order: number;
    exercise: {
      id: number;
      name: string;
    };
    workout?: {
      id: number;
      name: string;
    };
  }>;
  planInstanceDays?: Array<{
    id: number;
    planInstanceId: number;
    planDayId: number;
    planInstance: {
      id: number;
      planId: number;
      iterationNumber: number | null;
      status: string | null;
      plan: {
        id: number;
        name: string;
      };
      mesocycle: {
        id: number;
        name: string;
      } | null;
    };
  }>;
  mesocycleId?: number | null;
}

export interface LatestWorkoutResponse {
  workoutInstanceId?: number;
  dayId?: number | null;
  dayNumber?: number | null;
  iterationId?: number | null;
  iterationNumber?: number | null;
  isRestDay?: boolean;
  workoutId?: number | null;
  workoutName?: string | null;
  inProgress: boolean;
  mesocycleId?: number | null;
  mesocycle?: CurrentMesocycle | null;
  needsNewIteration?: boolean;
  error?: string;
}

