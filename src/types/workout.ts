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

export interface ScheduleData {
  previousDays: PlanInstanceDay[];
  upcomingDays: PlanInstanceDay[];
}

export interface WorkoutInstance {
  id: number;
  completedAt: string | null;
  workout: {
    id: number;
    name: string;
  };
}

