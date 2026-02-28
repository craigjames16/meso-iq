import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import { CurrentMesocycle, ScheduleData, WorkoutInstance, LatestWorkoutResponse, HistoryData, UpcomingData } from '../types/workout';

export const workoutService = {
  async getMesocycles(): Promise<CurrentMesocycle[]> {
    try {
      const response = await apiClient.get<any>(
        endpoints.MESOCYCLES.LIST
      );
      
      // Validate response is an array
      if (!response) {
        return [];
      }
      
      // Check if response is wrapped in a data property
      let data = response;
      if (response.data && Array.isArray(response.data)) {
        data = response.data;
      }
      
      // Check if it's an error object
      if (response.error) {
        throw new Error(response.error || response.message || 'Failed to fetch mesocycles');
      }
      
      if (!Array.isArray(data)) {
        // Try to extract a meaningful error message
        const errorMsg = data.message || data.error || 'Invalid response format: expected array';
        throw new Error(errorMsg);
      }
      
      return data as CurrentMesocycle[];
    } catch (error: any) {
      // If it's already an Error with a message, re-throw it
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Failed to fetch mesocycles');
    }
  },

  async getHistory(): Promise<HistoryData> {
    try {
      // Calculate date one year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const sinceDate = oneYearAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Call workout-instances endpoint with query parameters
      const workoutInstances = await apiClient.get<WorkoutInstance[]>(
        `${endpoints.WORKOUT_INSTANCES.LIST}?completed=true&since=${sinceDate}`
      );
      
      return {
        workoutInstances: Array.isArray(workoutInstances) ? workoutInstances : []
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch history');
    }
  },

  async getUpcoming(mesocycleId: number): Promise<UpcomingData> {
    try {
      const response = await apiClient.get<UpcomingData>(
        endpoints.MESOCYCLES.UPCOMING(mesocycleId)
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch upcoming days');
    }
  },

  async getLatestWorkout(): Promise<LatestWorkoutResponse | null> {
    try {
      const response = await apiClient.get<LatestWorkoutResponse>(
        endpoints.WORKOUT_INSTANCES.LATEST
      );
      return response;
    } catch (error: any) {
      // If it's a 404, return null to indicate no workout found
      if (error.status === 404 || error.response?.status === 404) {
        return null;
      }
      throw new Error(error.message || 'Failed to fetch latest workout');
    }
  },

  async createPlanInstance(planId: number, mesocycleId?: number, iterationNumber?: number): Promise<any> {
    try {
      const response = await apiClient.post<any>(
        endpoints.PLAN_INSTANCES.CREATE,
        {
          planId,
          mesocycleId,
          iterationNumber,
        }
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create plan instance');
    }
  },

  async startWorkout(instanceId: number, dayId: number): Promise<WorkoutInstance> {
    try {
      const response = await apiClient.post<WorkoutInstance>(
        endpoints.PLAN_INSTANCES.START_WORKOUT(instanceId, dayId)
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to start workout');
    }
  },

  async completeRestDay(instanceId: number, dayId: number): Promise<void> {
    try {
      await apiClient.post(
        endpoints.PLAN_INSTANCES.COMPLETE_REST(instanceId, dayId)
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete rest day');
    }
  },

  async getWorkoutInstance(id: number): Promise<any> {
    try {
      const response = await apiClient.get<any>(
        endpoints.WORKOUT_INSTANCES.GET(id)
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch workout instance');
    }
  },

  async completeWorkout(id: number): Promise<any> {
    try {
      const response = await apiClient.post<any>(
        endpoints.WORKOUT_INSTANCES.COMPLETE(id)
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete workout');
    }
  },

  async addSet(
    workoutInstanceId: number, 
    exerciseId: number, 
    weight: number, 
    reps: number, 
    setNumber: number,
    subSetNumber?: number | null,
    setType?: 'REGULAR' | 'DROP_SET' | 'MYO_REP'
  ): Promise<any> {
    try {
      const response = await apiClient.post<any>(
        endpoints.WORKOUT_INSTANCES.SETS(workoutInstanceId),
        {
          exerciseId,
          sets: [{ 
            weight, 
            reps, 
            setNumber,
            subSetNumber: subSetNumber ?? null,
            setType: setType || 'REGULAR'
          }],
        }
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add set');
    }
  },

  async convertSetType(workoutInstanceId: number, setId: number, setType: 'REGULAR' | 'DROP_SET' | 'MYO_REP'): Promise<any> {
    try {
      const response = await apiClient.patch<any>(
        `/api/workout-instances/${workoutInstanceId}/sets/${setId}`,
        { setType }
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to convert set type');
    }
  },

  async addSubSet(
    workoutInstanceId: number,
    exerciseId: number,
    parentSetNumber: number,
    weight: number,
    reps: number
  ): Promise<any> {
    try {
      // First, get existing sets to find the next subSetNumber
      const workoutInstance = await this.getWorkoutInstance(workoutInstanceId);
      const existingSets = workoutInstance.exerciseSets?.filter(
        (set: any) => set.exerciseId === exerciseId && set.setNumber === parentSetNumber && set.subSetNumber != null
      ) || [];
      
      const maxSubSetNumber = existingSets.length > 0
        ? Math.max(...existingSets.map((set: any) => set.subSetNumber || 0))
        : 0;
      
      const nextSubSetNumber = maxSubSetNumber + 1;

      return await this.addSet(
        workoutInstanceId,
        exerciseId,
        weight,
        reps,
        parentSetNumber,
        nextSubSetNumber,
        'DROP_SET' // Default to DROP_SET for sub-sets, can be changed later
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add sub-set');
    }
  },

  async deleteSet(workoutInstanceId: number, setIds: number[]): Promise<void> {
    try {
      await apiClient.delete(
        endpoints.WORKOUT_INSTANCES.SETS(workoutInstanceId),
        { setIds }
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete set');
    }
  },

  async getExercises(): Promise<any> {
    try {
      const response = await apiClient.get<any>(
        endpoints.EXERCISES.LIST
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch exercises');
    }
  },

  async addExercise(workoutInstanceId: number, exerciseIds: number | number[]): Promise<any> {
    try {
      // Normalize to array format for backend
      const exerciseIdArray = Array.isArray(exerciseIds) ? exerciseIds : [exerciseIds];
      const response = await apiClient.post<any>(
        endpoints.WORKOUT_INSTANCES.EXERCISES(workoutInstanceId),
        { exerciseId: exerciseIdArray }
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add exercise');
    }
  },

  async removeExercise(workoutInstanceId: number, exerciseId: number): Promise<any> {
    try {
      const response = await apiClient.delete(
        endpoints.WORKOUT_INSTANCES.EXERCISES(workoutInstanceId),
        { exerciseId }
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to remove exercise');
    }
  },

  async reorderExercise(workoutInstanceId: number, exerciseId: number, direction: 'up' | 'down'): Promise<void> {
    try {
      await apiClient.post(
        endpoints.WORKOUT_INSTANCES.REORDER_EXERCISE(workoutInstanceId),
        { exerciseId, direction }
      );
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reorder exercise');
    }
  },

  async createStandaloneWorkout(name?: string): Promise<WorkoutInstance> {
    try {
      const response = await apiClient.post<WorkoutInstance>(
        endpoints.WORKOUT_INSTANCES.LIST,
        name ? { name } : {}
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create standalone workout');
    }
  },
};

