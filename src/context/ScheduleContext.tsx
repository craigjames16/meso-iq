import React, { createContext, useState, useCallback, useContext } from 'react';
import { workoutService } from '../services/workoutService';
import { ScheduleData } from '../types/workout';

interface ScheduleState {
  schedule: ScheduleData | null;
  mesocycleId: number | null;
  loading: boolean;
  error: string | null;
}

interface ScheduleContextType extends ScheduleState {
  fetchSchedule: (mesocycleId: number) => Promise<void>;
  refreshSchedule: () => Promise<void>;
  clearSchedule: () => void;
}

const initialState: ScheduleState = {
  schedule: null,
  mesocycleId: null,
  loading: false,
  error: null,
};

export const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

interface ScheduleProviderProps {
  children: React.ReactNode;
}

export const ScheduleProvider: React.FC<ScheduleProviderProps> = ({ children }) => {
  const [state, setState] = useState<ScheduleState>(initialState);

  const fetchSchedule = useCallback(async (mesocycleId: number) => {
    setState((prev) => {
      // Don't refetch if we already have data for this mesocycle and not loading
      if (prev.mesocycleId === mesocycleId && prev.schedule !== null && !prev.loading) {
        return prev;
      }
      
      return {
        ...prev,
        loading: true,
        error: null,
      };
    });

    try {
      const schedule = await workoutService.getSchedule(mesocycleId);
      setState((prev) => {
        // Only update if this is still the requested mesocycle (or no mesocycle set yet)
        // This prevents race conditions if mesocycle changes while fetching
        if (prev.mesocycleId === mesocycleId || prev.mesocycleId === null) {
          return {
            schedule,
            mesocycleId,
            loading: false,
            error: null,
          };
        }
        // If mesocycle changed, keep the current state
        return prev;
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch schedule';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const refreshSchedule = useCallback(async () => {
    if (!state.mesocycleId) {
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const schedule = await workoutService.getSchedule(state.mesocycleId);
      setState((prev) => ({
        ...prev,
        schedule,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh schedule';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [state.mesocycleId]);

  const clearSchedule = useCallback(() => {
    setState(initialState);
  }, []);

  const value: ScheduleContextType = {
    ...state,
    fetchSchedule,
    refreshSchedule,
    clearSchedule,
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = (): ScheduleContextType => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

