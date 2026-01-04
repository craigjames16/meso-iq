import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/env';
import { MesocycleListItem, MesocycleDetail } from '../types/plan';

export const mesocyclesService = {
  async getMesocycles(): Promise<MesocycleListItem[]> {
    try {
      const response = await apiClient.get<MesocycleListItem[]>(API_ENDPOINTS.MESOCYCLES.LIST);
      
      if (!response) {
        return [];
      }
      
      // Handle wrapped response
      let data = response;
      if ((response as any).data && Array.isArray((response as any).data)) {
        data = (response as any).data;
      }
      
      if (!Array.isArray(data)) {
        console.error('getMesocycles: Expected array but got:', typeof data);
        return [];
      }
      
      return data;
    } catch (error: any) {
      console.error('Error fetching mesocycles:', error);
      throw new Error(error.message || 'Failed to fetch mesocycles');
    }
  },

  async createMesocycle(data: { name: string; planId: string; iterations: number }): Promise<MesocycleListItem> {
    try {
      const response = await apiClient.post<MesocycleListItem>(API_ENDPOINTS.MESOCYCLES.LIST, data);
      return response;
    } catch (error: any) {
      console.error('Error creating mesocycle:', error);
      throw new Error(error.message || 'Failed to create mesocycle');
    }
  },

  async getMesocycle(id: number): Promise<MesocycleDetail> {
    try {
      const response = await apiClient.get<MesocycleDetail>(API_ENDPOINTS.MESOCYCLES.GET(id));
      return response;
    } catch (error: any) {
      console.error('Error fetching mesocycle:', error);
      throw new Error(error.message || 'Failed to fetch mesocycle');
    }
  },

  async deleteMesocycle(id: number): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.MESOCYCLES.DELETE(id));
    } catch (error: any) {
      console.error('Error deleting mesocycle:', error);
      throw new Error(error.message || 'Failed to delete mesocycle');
    }
  },

  async completeMesocycle(id: number): Promise<MesocycleDetail> {
    try {
      const response = await apiClient.patch<MesocycleDetail>(API_ENDPOINTS.MESOCYCLES.COMPLETE(id), {
        action: 'complete',
      });
      return response;
    } catch (error: any) {
      console.error('Error completing mesocycle:', error);
      throw new Error(error.message || 'Failed to complete mesocycle');
    }
  },
};

