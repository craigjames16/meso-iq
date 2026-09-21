// API Configuration
// __DEV__ is true in Debug builds, false in Release builds

const getApiUrl = (): string => {
  if (__DEV__) {
    // Development: iOS simulator uses localhost, Android emulator uses 10.0.2.2
    // For physical device testing, use your computer's IP (e.g., 'http://192.168.1.100:3000')
    return 'http://10.0.0.208:3000';
  }
  // Production: your deployed API URL
  return 'https://api.meso-iq.com';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  AUTH: {
    SIGNIN: '/api/auth/mobile/signin',
    SIGNUP: '/api/auth/mobile/signup',
    SESSION: '/api/auth/mobile/session',
    SIGNOUT: '/api/auth/mobile/signout',
  },
  /** Current user (soft-delete account) */
  USERS: '/api/users',
  /** Logged sets CSV (session or Bearer) */
  EXPORT_SETS: '/api/export/sets',
  MESOCYCLES: {
    LIST: '/api/mesocycles',
    GET: (id: number) => `/api/mesocycles/${id}`,
    DELETE: (id: number) => `/api/mesocycles/${id}`,
    COMPLETE: (id: number) => `/api/mesocycles/${id}`,
    UPCOMING: (id: number) => `/api/mesocycles/${id}/upcoming`,
  },
  PLAN_INSTANCES: {
    CREATE: '/api/plan-instances',
    START_WORKOUT: (instanceId: number, dayId: number) => 
      `/api/plan-instances/${instanceId}/days/${dayId}/start`,
    COMPLETE_REST: (instanceId: number, dayId: number) => 
      `/api/plan-instances/${instanceId}/days/${dayId}/complete-rest`,
  },
  WORKOUT_INSTANCES: {
    LIST: '/api/workout-instances',
    LATEST: '/api/workout-instances/latest',
    HISTORY: '/api/workout-instances/history',
    GET: (id: number) => `/api/workout-instances/${id}`,
    COMPLETE: (id: number) => `/api/workout-instances/${id}/complete`,
    SETS: (id: number) => `/api/workout-instances/${id}/sets`,
    EXERCISES: (id: number) => `/api/workout-instances/${id}/exercises`,
    REORDER_EXERCISE: (id: number) => `/api/workout-instances/${id}/exercises/reorder/${id}`,
  },
  EXERCISES: {
    LIST: '/api/exercises',
    GET: (id: number) => `/api/exercises/${id}`,
    UPDATE: (id: number) => `/api/exercises/${id}`,
    DELETE: (id: number) => `/api/exercises/${id}`,
  },
  PLANS: {
    LIST: '/api/plans',
    GET: (id: number) => `/api/plans/${id}`,
    CREATE_WITH_AI: '/api/plans/create-with-ai',
  },
  DASHBOARD: {
    MUSCLE_GROUP_VOLUME: (mesocycleId?: number) =>
      mesocycleId
        ? `/api/dashboard?data=mesocycleMuscleGroupVolume&mesocycleId=${mesocycleId}`
        : `/api/dashboard?data=muscleGroupVolume`,
    MUSCLE_GROUP_SETS: (mesocycleId?: number) =>
      mesocycleId
        ? `/api/dashboard?data=mesocycleMuscleGroupSets&mesocycleId=${mesocycleId}`
        : `/api/dashboard?data=muscleGroupSets`,
    MESOCYCLE_PROGRESS: (id: number) => `/api/dashboard?data=mesocycle&id=${id}`,
    EXERCISE_STATS: '/api/dashboard?data=exerciseStats',
  },
};


