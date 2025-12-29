import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/env';

export interface Mesocycle {
  id: number;
  name: string;
  plan?: {
    id: number;
    name: string;
  };
}

export type MuscleGroupData = Record<string, Array<Record<string, { volume?: number; count?: number; date: string }>>>;

export const dashboardService = {
  async getMuscleGroupVolume(mesocycleId?: number): Promise<MuscleGroupData> {
    try {
      const endpoint = API_ENDPOINTS.DASHBOARD.MUSCLE_GROUP_VOLUME(mesocycleId);
      const response = await apiClient.get<MuscleGroupData>(endpoint);
      return response || {};
    } catch (error: any) {
      console.error('Error fetching muscle group volume:', error);
      throw new Error(error.message || 'Failed to fetch muscle group volume');
    }
  },

  async getMuscleGroupSets(mesocycleId?: number): Promise<MuscleGroupData> {
    try {
      const endpoint = API_ENDPOINTS.DASHBOARD.MUSCLE_GROUP_SETS(mesocycleId);
      const response = await apiClient.get<MuscleGroupData>(endpoint);
      return response || {};
    } catch (error: any) {
      console.error('Error fetching muscle group sets:', error);
      throw new Error(error.message || 'Failed to fetch muscle group sets');
    }
  },

  async getMesocycles(): Promise<Mesocycle[]> {
    try {
      const response = await apiClient.get<Mesocycle[]>(API_ENDPOINTS.MESOCYCLES.LIST);
      
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

  async fetchDashboardData(mesocycleId?: number): Promise<{
    volumeData: MuscleGroupData;
    setData: MuscleGroupData;
  }> {
    const [volumeData, setData] = await Promise.all([
      this.getMuscleGroupVolume(mesocycleId),
      this.getMuscleGroupSets(mesocycleId),
    ]);
    
    return { volumeData, setData };
  },
};

