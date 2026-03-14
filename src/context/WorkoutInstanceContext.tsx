import React, { createContext, useState, useCallback, useContext } from 'react';
import { workoutService } from '../services/workoutService';

interface WorkoutInstanceState {
  workoutInstance: any | null;
  loading: boolean;
  error: string | null;
}

interface WorkoutInstanceContextType extends WorkoutInstanceState {
  fetchWorkoutInstance: (workoutInstanceId: number) => Promise<void>;
  clearWorkoutInstance: () => void;
  refreshWorkoutInstance: () => Promise<any | null>;
}

const initialState: WorkoutInstanceState = {
  workoutInstance: null,
  loading: false,
  error: null,
};

export const WorkoutInstanceContext = createContext<WorkoutInstanceContextType | undefined>(undefined);

interface WorkoutInstanceProviderProps {
  children: React.ReactNode;
}

export const WorkoutInstanceProvider: React.FC<WorkoutInstanceProviderProps> = ({ children }) => {
  const [state, setState] = useState<WorkoutInstanceState>(initialState);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const fetchWorkoutInstance = useCallback(async (workoutInstanceId: number) => {
    setCurrentId(workoutInstanceId);
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const workoutData = await workoutService.getWorkoutInstance(workoutInstanceId);
      setState({
        workoutInstance: workoutData,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState({
        workoutInstance: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch workout',
      });
    }
  }, []);

  const clearWorkoutInstance = useCallback(() => {
    setState(initialState);
    setCurrentId(null);
  }, []);

  const refreshWorkoutInstance = useCallback(async (): Promise<any | null> => {
    if (currentId === null) return null;
    try {
      const workoutData = await workoutService.getWorkoutInstance(currentId);
      setState({
        workoutInstance: workoutData,
        loading: false,
        error: null,
      });
      return workoutData;
    } catch (err: any) {
      setState({
        workoutInstance: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch workout',
      });
      return null;
    }
  }, [currentId]);

  const value: WorkoutInstanceContextType = {
    ...state,
    fetchWorkoutInstance,
    clearWorkoutInstance,
    refreshWorkoutInstance,
  };

  return (
    <WorkoutInstanceContext.Provider value={value}>
      {children}
    </WorkoutInstanceContext.Provider>
  );
};

export function useWorkoutInstance(): WorkoutInstanceContextType {
  const context = useContext(WorkoutInstanceContext);
  if (context === undefined) {
    throw new Error('useWorkoutInstance must be used within a WorkoutInstanceProvider');
  }
  return context;
}
