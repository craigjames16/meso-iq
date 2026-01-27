import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import { CurrentMesocycle, ScheduleData, WorkoutInstance } from '../types/workout';

export const workoutService = {
  async getMesocycles(): Promise<CurrentMesocycle[]> {
    try {
      console.log('getMesocycles: Fetching from', endpoints.MESOCYCLES.LIST);
      const response = await apiClient.get<any>(
        endpoints.MESOCYCLES.LIST
      );
      
      console.log('getMesocycles: Raw response:', JSON.stringify(response, null, 2));
      console.log('getMesocycles: Response type:', typeof response);
      console.log('getMesocycles: Is array?', Array.isArray(response));
      
      // Validate response is an array
      if (!response) {
        console.warn('getMesocycles: No response received');
        return [];
      }
      
      // Check if response is wrapped in a data property
      let data = response;
      if (response.data && Array.isArray(response.data)) {
        console.log('getMesocycles: Response wrapped in data property');
        data = response.data;
      }
      
      // Check if it's an error object
      if (response.error) {
        console.error('getMesocycles: Error in response:', response.error);
        throw new Error(response.error || response.message || 'Failed to fetch mesocycles');
      }
      
      if (!Array.isArray(data)) {
        console.error('getMesocycles: Expected array but got:', typeof data, data);
        // Try to extract a meaningful error message
        const errorMsg = data.message || data.error || 'Invalid response format: expected array';
        throw new Error(errorMsg);
      }
      
      return data as CurrentMesocycle[];
    } catch (error: any) {
      console.error('getMesocycles error:', error);
      // If it's already an Error with a message, re-throw it
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Failed to fetch mesocycles');
    }
  },

  async getSchedule(mesocycleId: number): Promise<ScheduleData> {
    try {
      const response = await apiClient.get<ScheduleData>(
        endpoints.MESOCYCLES.SCHEDULE(mesocycleId)
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch schedule');
    }
  },

  async getLatestWorkout(): Promise<any> {
    try {
      const response = await apiClient.get<any>(
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

  async addSet(workoutInstanceId: number, exerciseId: number, weight: number, reps: number, setNumber: number): Promise<any> {
    try {
      const response = await apiClient.post<any>(
        endpoints.WORKOUT_INSTANCES.SETS(workoutInstanceId),
        {
          exerciseId,
          sets: [{ weight, reps, setNumber }],
        }
      );
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add set');
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

