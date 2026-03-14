import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/env';
import { ExerciseListItem, ExercisesByCategory } from '../types/plan';

export interface ExerciseDetailResponse {
  id: number;
  name: string;
  category: string;
  history: Array<{
    workoutInstanceId: number;
    volume: number;
    completedAt: string | null;
    sets: Array<{
      weight: number;
      reps: number;
      setNumber: number;
      subSetNumber?: number | null;
      setType?: 'REGULAR' | 'DROP_SET' | 'MYO_REP';
    }>;
  }>;
  volumeProgression?: Array<{ workoutInstanceId: number; date: string; volume: number; sets: number }>;
  lastPerformed?: string | null;
  prs?: { maxWeight: number; maxReps: number; maxVolume: number };
}

export const exercisesService = {
  async getExercises(): Promise<ExercisesByCategory> {
    try {
      const response = await apiClient.get<ExercisesByCategory>(API_ENDPOINTS.EXERCISES.LIST);
      return response || {};
    } catch (error: any) {
      console.error('Error fetching exercises:', error);
      throw new Error(error.message || 'Failed to fetch exercises');
    }
  },

  async getExercise(id: number): Promise<ExerciseDetailResponse> {
    try {
      const response = await apiClient.get<ExerciseDetailResponse>(API_ENDPOINTS.EXERCISES.GET(id));
      return response;
    } catch (error: any) {
      console.error('Error fetching exercise:', error);
      throw new Error(error.message || 'Failed to fetch exercise');
    }
  },

  async createExercise(data: { name: string; category: string }): Promise<ExerciseListItem> {
    try {
      const response = await apiClient.post<ExerciseListItem>(API_ENDPOINTS.EXERCISES.LIST, data);
      return response;
    } catch (error: any) {
      console.error('Error creating exercise:', error);
      throw new Error(error.message || 'Failed to create exercise');
    }
  },
};

