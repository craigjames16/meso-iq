import type { ExerciseSession, SeriesPoint, Session, SetRecord } from '../types';

export function set(exerciseId: number, weight: number, reps: number, setNumber = 1, extra: Partial<SetRecord> = {}): SetRecord {
  return { exerciseId, weight, reps, setNumber, subSetNumber: null, setType: 'REGULAR', ...extra };
}

export function drop(exerciseId: number, weight: number, reps: number, setNumber: number, subSetNumber = 1): SetRecord {
  return { exerciseId, weight, reps, setNumber, subSetNumber, setType: 'DROP_SET' };
}

/** Local-time ISO string, so date bucketing is independent of the test machine's zone. */
export function at(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h).toISOString();
}

let nextId = 1000;
export function session(completedAt: string, sets: SetRecord[], extra: Partial<Session> = {}): Session {
  nextId += 1;
  return {
    workoutInstanceId: nextId,
    workoutId: 1,
    workoutName: 'Push',
    completedAt,
    sets,
    planned: true,
    ...extra,
  };
}

export function exSession(completedAt: string, sets: SetRecord[], workoutInstanceId?: number): ExerciseSession {
  nextId += 1;
  return { workoutInstanceId: workoutInstanceId ?? nextId, completedAt, sets };
}

export function point(date: string, e1rm: number): SeriesPoint {
  nextId += 1;
  return { workoutInstanceId: nextId, date, e1rm, weight: e1rm, reps: 1, isPR: false };
}
