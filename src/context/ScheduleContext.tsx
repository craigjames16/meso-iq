import React, { createContext, useState, useCallback, useContext, useRef, useEffect } from 'react';
import { workoutService } from '../services/workoutService';
import { ScheduleData, HistoryData, UpcomingData } from '../types/workout';

interface ScheduleState {
  schedule: ScheduleData | null;
  history: HistoryData | null;
  mesocycleId: number | null;
  loading: boolean;
  error: string | null;
}

interface ScheduleContextType extends ScheduleState {
  fetchHistory: (force?: boolean) => Promise<void>;
  fetchSchedule: (mesocycleId: number, force?: boolean) => Promise<void>;
  refreshSchedule: () => Promise<void>;
  clearSchedule: () => void;
}

const initialState: ScheduleState = {
  schedule: null,
  history: null,
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
  const stateRef = useRef<ScheduleState>(state);
  
  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchHistory = useCallback(async (force: boolean = false) => {
    setState((prev) => {
      // Don't refetch if we already have history and not loading (unless forced)
      if (!force && prev.history !== null && !prev.loading) {
        return prev;
      }
      return {
        ...prev,
        loading: true,
        error: null,
      };
    });

    try {
      const history = await workoutService.getHistory();
      setState((prev) => {
        // Combine with existing upcoming days if available
        const schedule: ScheduleData | null = prev.schedule
          ? {
              previousDays: history.previousDays,
              upcomingDays: prev.schedule.upcomingDays,
            }
          : {
              previousDays: history.previousDays,
              upcomingDays: [],
            };

        return {
          ...prev,
          history,
          schedule,
          loading: false,
          error: null,
        };
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch history';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const fetchSchedule = useCallback(async (mesocycleId: number, force: boolean = false) => {
    setState((prev) => {
      // Don't refetch if we already have data for this mesocycle and not loading (unless forced)
      if (!force && prev.mesocycleId === mesocycleId && prev.schedule !== null && !prev.loading) {
        return prev;
      }
      return {
        ...prev,
        loading: true,
        error: null,
      };
    });

    try {
      // Always fetch history first if we don't have it (use ref to get current value)
      let history = stateRef.current.history;

      if (!history || force) {
        try {
          history = await workoutService.getHistory();
          setState((prev) => ({
            ...prev,
            history,
          }));
        } catch (historyError) {
          console.error('Error fetching history:', historyError);
          // Continue even if history fails - use empty array
          history = { previousDays: [] };
        }
      }

      // Fetch upcoming days for the mesocycle
      const upcoming = await workoutService.getUpcoming(mesocycleId);
      
      // Combine history and upcoming into schedule
      const schedule: ScheduleData = {
        previousDays: history.previousDays,
        upcomingDays: upcoming.upcomingDays,
      };

      setState((prev) => {
        // Only update if this is still the requested mesocycle (or no mesocycle set yet)
        // This prevents race conditions if mesocycle changes while fetching
        if (prev.mesocycleId === mesocycleId || prev.mesocycleId === null) {
          return {
            ...prev,
            schedule,
            history,
            mesocycleId,
            loading: false,
            error: null,
          };
        }
        // If mesocycle changed, keep the current state but clear loading to prevent hanging
        return {
          ...prev,
          loading: false,
        };
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
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      // Get current mesocycleId using ref
      const currentMesocycleId = stateRef.current.mesocycleId;

      // Refresh both history and upcoming days
      const [history, upcoming] = await Promise.all([
        workoutService.getHistory().catch((err) => {
          console.error('Error refreshing history:', err);
          return { previousDays: [] } as HistoryData;
        }),
        currentMesocycleId
          ? workoutService.getUpcoming(currentMesocycleId).catch((err) => {
              console.error('Error refreshing upcoming:', err);
              return { upcomingDays: [] } as UpcomingData;
            })
          : Promise.resolve({ upcomingDays: [] } as UpcomingData),
      ]);

      const schedule: ScheduleData = {
        previousDays: history.previousDays,
        upcomingDays: upcoming.upcomingDays,
      };

      setState((prev) => ({
        ...prev,
        schedule,
        history,
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
  }, []);

  const clearSchedule = useCallback(() => {
    setState((prev) => ({
      ...prev,
      schedule: prev.history
        ? {
            previousDays: prev.history.previousDays,
            upcomingDays: [],
          }
        : null,
      mesocycleId: null,
    }));
  }, []);

  const value: ScheduleContextType = {
    ...state,
    fetchHistory,
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

