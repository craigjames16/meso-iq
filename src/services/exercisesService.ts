import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/env';
import { ExerciseListItem, ExercisesByCategory } from '../types/plan';

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

