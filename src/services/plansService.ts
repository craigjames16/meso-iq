import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/env';
import { Plan } from '../types/plan';

export const plansService = {
  async getPlans(): Promise<Plan[]> {
    try {
      const response = await apiClient.get<Plan[]>(API_ENDPOINTS.PLANS.LIST);
      
      if (!response) {
        return [];
      }
      
      // Handle wrapped response
      let data = response;
      if ((response as any).data && Array.isArray((response as any).data)) {
        data = (response as any).data;
      }
      
      if (!Array.isArray(data)) {
        console.error('getPlans: Expected array but got:', typeof data);
        return [];
      }
      
      return data;
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      throw new Error(error.message || 'Failed to fetch plans');
    }
  },

  async createPlan(data: { name: string; days: any[] }): Promise<Plan> {
    try {
      const response = await apiClient.post<Plan>(API_ENDPOINTS.PLANS.LIST, data);
      return response;
    } catch (error: any) {
      console.error('Error creating plan:', error);
      throw new Error(error.message || 'Failed to create plan');
    }
  },

  async getPlan(id: number): Promise<Plan> {
    try {
      const response = await apiClient.get<Plan>(API_ENDPOINTS.PLANS.GET(id));
      return response;
    } catch (error: any) {
      console.error('Error fetching plan:', error);
      throw new Error(error.message || 'Failed to fetch plan');
    }
  },

  async updatePlan(id: number, data: { name: string; days: Array<{ isRestDay: boolean; workoutExercises: Array<{ id: number; order: number }> }> }): Promise<Plan> {
    try {
      const response = await apiClient.put<Plan>(API_ENDPOINTS.PLANS.GET(id), data);
      return response;
    } catch (error: any) {
      console.error('Error updating plan:', error);
      throw new Error(error.message || 'Failed to update plan');
    }
  },
};

