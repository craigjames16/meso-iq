// API Configuration
// For iOS simulator, use 'http://localhost:3000'
// For Android emulator, use 'http://10.0.2.2:3000'
// For physical device, use your computer's IP address (e.g., 'http://192.168.1.100:3000')

const getApiUrl = (): string => {
  // You can override this with an environment variable or config file
  // For now, defaulting to localhost (works for iOS simulator)
  // Android emulator users should change this to 'http://10.0.2.2:3000'
  return 'http://localhost:3000';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  AUTH: {
    SIGNIN: '/api/auth/mobile/signin',
    SIGNUP: '/api/auth/mobile/signup',
    SESSION: '/api/auth/mobile/session',
    SIGNOUT: '/api/auth/mobile/signout',
  },
  MESOCYCLES: {
    LIST: '/api/mesocycles',
    SCHEDULE: (id: number) => `/api/mesocycles/${id}/schedule`,
  },
  PLAN_INSTANCES: {
    CREATE: '/api/plan-instances',
    START_WORKOUT: (instanceId: number, dayId: number) => 
      `/api/plan-instances/${instanceId}/days/${dayId}/start`,
    COMPLETE_REST: (instanceId: number, dayId: number) => 
      `/api/plan-instances/${instanceId}/days/${dayId}/complete-rest`,
  },
  WORKOUT_INSTANCES: {
    GET: (id: number) => `/api/workout-instances/${id}`,
    COMPLETE: (id: number) => `/api/workout-instances/${id}/complete`,
    SETS: (id: number) => `/api/workout-instances/${id}/sets`,
    EXERCISES: (id: number) => `/api/workout-instances/${id}/exercises`,
    REORDER_EXERCISE: (id: number) => `/api/workout-instances/${id}/exercises/reorder/${id}`,
  },
  EXERCISES: {
    LIST: '/api/exercises',
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
  },
};

