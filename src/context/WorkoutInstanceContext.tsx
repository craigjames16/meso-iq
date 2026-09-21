import React, { createContext, useState, useCallback, useContext, useRef, useEffect } from 'react';
import { workoutService } from '../services/workoutService';
import { exercisesService, type ExerciseDetailResponse } from '../services/exercisesService';
import type { HistoryInstance } from '../components/ExerciseHistoryModal';
import type { ExerciseTracking } from '../components/ExerciseTrackingCard';
import {
  resolveWorkoutTrackings,
  buildExerciseTrackingForWorkoutExercise,
  type ExerciseDetailData,
} from '../utils/workoutTrackingResolver';

export type { ExerciseDetailData } from '../utils/workoutTrackingResolver';

interface WorkoutInstanceState {
  workoutInstance: any | null;
  loading: boolean;
  error: string | null;
}

export type TrackingsMap = Record<number, ExerciseTracking[]>;
export type ExerciseDetailsMap = Record<number, ExerciseDetailData>;

interface WorkoutInstanceContextType extends WorkoutInstanceState {
  trackingsMap: TrackingsMap;
  exerciseDetailsMap: ExerciseDetailsMap;
  trackingsLoading: boolean;
  /** Loads workout instance; resolves trackings + exercise details unless already cached for this id. */
  loadWorkoutData: (workoutInstanceId: number) => Promise<void>;
  fetchWorkoutInstance: (workoutInstanceId: number) => Promise<void>;
  clearWorkoutInstance: () => void;
  refreshWorkoutInstance: () => Promise<any | null>;
  updateExerciseTrackings: (
    workoutInstanceId: number,
    updater: (prev: ExerciseTracking[]) => ExerciseTracking[]
  ) => void;
  clearWorkoutTrackings: (workoutInstanceId: number) => void;
  /** Sync local trackings with a server workout instance response (add, remove, reorder). Keeps existing exercises' local state; only resolves new ones. */
  syncWorkoutInstance: (workoutInstanceId: number, updatedWorkoutInstance: any) => Promise<void>;
}

const initialState: WorkoutInstanceState = {
  workoutInstance: null,
  loading: false,
  error: null,
};

export const WorkoutInstanceContext = createContext<WorkoutInstanceContextType | undefined>(
  undefined
);

interface WorkoutInstanceProviderProps {
  children: React.ReactNode;
}

export function exerciseResponseToDetail(data: ExerciseDetailResponse): ExerciseDetailData {
  const rawHistory = data.history ?? [];
  const history: HistoryInstance[] = rawHistory
    .filter((h) => h.completedAt != null)
    .map((h) => ({
      workoutInstanceId: h.workoutInstanceId,
      volume: h.volume,
      completedAt: h.completedAt as string | Date,
      sets: h.sets ?? [],
    }));
  const lastEntry = history.length > 0 ? history[history.length - 1] : null;
  const lastSets = lastEntry?.sets ?? [];
  const lastVolume = lastEntry?.volume ?? null;
  return {
    history,
    lastVolume: lastVolume != null ? lastVolume : null,
    lastSets: Array.isArray(lastSets) ? lastSets : [],
  };
}

const emptyDetail = (): ExerciseDetailData => ({
  history: [],
  lastVolume: null,
  lastSets: [],
});

export const WorkoutInstanceProvider: React.FC<WorkoutInstanceProviderProps> = ({ children }) => {
  const [state, setState] = useState<WorkoutInstanceState>(initialState);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [trackingsMap, setTrackingsMap] = useState<TrackingsMap>({});
  const trackingsMapRef = useRef<TrackingsMap>(trackingsMap);
  useEffect(() => {
    trackingsMapRef.current = trackingsMap;
  }, [trackingsMap]);
  const [exerciseDetailsMap, setExerciseDetailsMap] = useState<ExerciseDetailsMap>({});
  const exerciseDetailsMapRef = useRef<ExerciseDetailsMap>(exerciseDetailsMap);
  useEffect(() => {
    exerciseDetailsMapRef.current = exerciseDetailsMap;
  }, [exerciseDetailsMap]);
  const [trackingsLoading, setTrackingsLoading] = useState(false);

  const clearWorkoutTrackings = useCallback((workoutInstanceId: number) => {
    setTrackingsMap((prev) => {
      const next = { ...prev };
      delete next[workoutInstanceId];
      return next;
    });
  }, []);

  const syncWorkoutInstance = useCallback(
    async (workoutInstanceId: number, updatedWorkoutInstance: any) => {
      setState((s) => ({
        ...s,
        workoutInstance: updatedWorkoutInstance,
        loading: false,
        error: null,
      }));

      const previous = trackingsMapRef.current[workoutInstanceId] ?? [];
      const byId = new Map(previous.map((t) => [t.exerciseId, t]));
      const workoutExercises = updatedWorkoutInstance.workoutExercises ?? [];
      const isCompleted = !!updatedWorkoutInstance.completedAt;

      const newWEs = workoutExercises.filter((we: any) => {
        const id = we.exercise?.id ?? we.exerciseId;
        return !byId.has(id);
      });

      let mergedDetails = exerciseDetailsMapRef.current;
      if (newWEs.length > 0) {
        const newIds = newWEs.map(
          (we: any) => we.exercise?.id ?? we.exerciseId
        ) as number[];
        const detailEntries = await Promise.all(
          newIds.map(async (id: number) => {
            try {
              const data = await exercisesService.getExercise(id);
              return [id, exerciseResponseToDetail(data)] as const;
            } catch {
              return [id, emptyDetail()] as const;
            }
          })
        );
        mergedDetails = { ...mergedDetails, ...Object.fromEntries(detailEntries) };
        exerciseDetailsMapRef.current = mergedDetails;
        setExerciseDetailsMap(mergedDetails);
      }

      const nextTrackings: ExerciseTracking[] = workoutExercises.map((we: any) => {
        const id = we.exercise?.id ?? we.exerciseId;
        const kept = byId.get(id);
        if (kept) {
          return {
            ...kept,
            order: we.order ?? kept.order,
            exerciseName: we.exercise?.name ?? kept.exerciseName,
          };
        }
        return buildExerciseTrackingForWorkoutExercise(we, isCompleted, mergedDetails);
      });

      nextTrackings.sort((a, b) => a.order - b.order);

      setTrackingsMap((prev) => ({
        ...prev,
        [workoutInstanceId]: nextTrackings,
      }));
    },
    []
  );

  const updateExerciseTrackings = useCallback(
    (
      workoutInstanceId: number,
      updater: (prev: ExerciseTracking[]) => ExerciseTracking[]
    ) => {
      setTrackingsMap((prev) => ({
        ...prev,
        [workoutInstanceId]: updater(prev[workoutInstanceId] ?? []),
      }));
    },
    []
  );

  const loadWorkoutData = useCallback(async (workoutInstanceId: number) => {
    setCurrentId(workoutInstanceId);
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setTrackingsLoading(true);

    try {
      const workoutData = await workoutService.getWorkoutInstance(workoutInstanceId);
      setState({
        workoutInstance: workoutData,
        loading: false,
        error: null,
      });

      if (trackingsMapRef.current[workoutInstanceId]) {
        return;
      }

      const workoutExercises = workoutData.workoutExercises ?? [];
      const exerciseIds = workoutExercises.map(
        (we: any) => we.exercise?.id ?? we.exerciseId
      ) as number[];

      const detailEntries = await Promise.all(
        exerciseIds.map(async (id: number) => {
          try {
            const data = await exercisesService.getExercise(id);
            return [id, exerciseResponseToDetail(data)] as const;
          } catch {
            return [id, emptyDetail()] as const;
          }
        })
      );

      const exerciseDetailById: Record<number, ExerciseDetailData> =
        Object.fromEntries(detailEntries);

      setExerciseDetailsMap((prev) => ({ ...prev, ...exerciseDetailById }));

      const trackings = resolveWorkoutTrackings(workoutData, exerciseDetailById);
      setTrackingsMap((prev) => ({
        ...prev,
        [workoutInstanceId]: trackings,
      }));
    } catch (err: any) {
      setState({
        workoutInstance: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch workout',
      });
    } finally {
      setTrackingsLoading(false);
    }
  }, []);

  const fetchWorkoutInstance = useCallback(async (workoutInstanceId: number) => {
    await loadWorkoutData(workoutInstanceId);
  }, [loadWorkoutData]);

  const clearWorkoutInstance = useCallback(() => {
    setState(initialState);
    setCurrentId(null);
    setTrackingsMap({});
    setExerciseDetailsMap({});
    setTrackingsLoading(false);
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
    trackingsMap,
    exerciseDetailsMap,
    trackingsLoading,
    loadWorkoutData,
    fetchWorkoutInstance,
    clearWorkoutInstance,
    refreshWorkoutInstance,
    updateExerciseTrackings,
    clearWorkoutTrackings,
    syncWorkoutInstance,
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
