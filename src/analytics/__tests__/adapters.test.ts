import { cycleProgressFromSessions, exerciseSessionsFromDetail, muscleMapFromExercises, sessionsFromHistory } from '../adapters';
import type { WorkoutInstance } from '../../types/workout';

const instance = (id: number, completedAt: string | null, planned: boolean): WorkoutInstance => ({
  id,
  workoutId: 7,
  startedAt: completedAt ?? '',
  completedAt,
  createdAt: '',
  updatedAt: '',
  workout: { id: 7, name: 'Push' },
  exerciseSets: [
    { id: 1, exerciseId: 3, setNumber: 1, subSetNumber: null, setType: 'REGULAR', weight: 100, reps: 8, exercise: { id: 3, name: 'Bench', category: 'CHEST' } },
    { id: 2, exerciseId: 3, setNumber: 1, subSetNumber: 1, setType: 'DROP_SET', weight: 80, reps: 6, exercise: { id: 3, name: 'Bench', category: 'CHEST' } },
  ],
  planInstanceDays: planned
    ? [
        {
          id: 1,
          planInstanceId: 1,
          planDayId: 1,
          planDay: { id: 1, dayNumber: 1 },
          planInstance: { id: 1, planId: 1, iterationNumber: 2, status: null, rir: 2, plan: { id: 1, name: 'PPL' }, mesocycle: { id: 9, name: 'Meso 3' } },
        },
      ]
    : [],
});

describe('adapters', () => {
  it('adapts completed history, keeping set fields and plan context', () => {
    const sessions = sessionsFromHistory([instance(2, '2026-09-02T10:00:00Z', false), instance(1, '2026-09-01T10:00:00Z', true), instance(3, null, true)]);
    expect(sessions.map((s) => s.workoutInstanceId)).toEqual([1, 2]);
    expect(sessions[0]).toMatchObject({ planned: true, mesocycleId: 9, iteration: 2, rir: 2, workoutId: 7 });
    expect(sessions[1].planned).toBe(false);
    expect(sessions[0].sets[1]).toMatchObject({ subSetNumber: 1, setType: 'DROP_SET' });
  });

  it('reads sets nested under workoutExercises', () => {
    const base = instance(8, '2026-09-03T10:00:00Z', true);
    const nested = {
      ...base,
      exerciseSets: undefined,
      workoutExercises: [
        {
          id: 1,
          exerciseId: 3,
          order: 0,
          exercise: { id: 3, name: 'Bench', category: 'CHEST' },
          sets: [{ weight: 100, reps: 8, setNumber: 1, subSetNumber: null, setType: 'REGULAR' }],
        },
      ],
    } as unknown as WorkoutInstance;
    const [s] = sessionsFromHistory([nested]);
    expect(s.sets).toEqual([{ exerciseId: 3, weight: 100, reps: 8, setNumber: 1, subSetNumber: null, setType: 'REGULAR' }]);
    expect(s.exerciseNames?.[3]).toBe('Bench');
  });

  it('builds cycle progress from planned sessions of one mesocycle', () => {
    const sessions = sessionsFromHistory([instance(1, '2026-09-01T10:00:00Z', true), instance(2, '2026-09-02T10:00:00Z', false)]);
    expect(cycleProgressFromSessions(sessions, 9).sessions).toHaveLength(1);
  });

  it('adapts exercise detail history', () => {
    const sessions = exerciseSessionsFromDetail({
      id: 3,
      history: [
        { workoutInstanceId: 5, volume: 0, completedAt: '2026-09-01T10:00:00Z', sets: [{ weight: 100, reps: 8, setNumber: 1 }] },
        { workoutInstanceId: 6, volume: 0, completedAt: null, sets: [] },
      ],
    });
    expect(sessions).toEqual([
      { workoutInstanceId: 5, completedAt: '2026-09-01T10:00:00Z', sets: [{ exerciseId: 3, weight: 100, reps: 8, setNumber: 1, subSetNumber: null, setType: undefined }] },
    ]);
  });

  it('maps exercises to muscles from the grouped list', () => {
    const map = muscleMapFromExercises({ chest: [{ id: 3, name: 'Bench', category: 'CHEST', highestWeight: 0 }], other: [{ id: 4, name: 'Plank', category: 'CORE', highestWeight: 0 }] });
    expect(map.get(3)).toBe('CHEST');
    expect(map.has(4)).toBe(false);
  });
});
