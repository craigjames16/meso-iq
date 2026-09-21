// Sample API responses for screen tests.

export const daysAgo = (n: number, hour = 12): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const meso = { id: 3, name: 'Meso 3', status: 'IN_PROGRESS', plan: { id: 4, name: 'PPL' } };

export const pushExercises = [
  { id: 101, order: 0, exerciseId: 10, exercise: { id: 10, name: 'Cable Flyes', category: 'CHEST' } },
  { id: 102, order: 1, exerciseId: 12, exercise: { id: 12, name: 'Dips', category: 'TRICEPS' } },
  { id: 103, order: 2, exerciseId: 13, exercise: { id: 13, name: 'Lateral Raises', category: 'SHOULDERS' } },
  { id: 104, order: 3, exerciseId: 14, exercise: { id: 14, name: 'Incline Press', category: 'CHEST' } },
];

export const upcomingPush = {
  id: 11,
  planInstanceId: 21,
  planDayId: 31,
  isComplete: false,
  createdAt: '',
  updatedAt: '',
  planDay: { id: 31, isRestDay: false, dayNumber: 3, workout: { id: 7, name: 'Push', workoutExercises: pushExercises } },
  workoutInstance: null,
  planInstance: { id: 21, iterationNumber: 2, status: 'IN_PROGRESS', startedAt: '', completedAt: null },
};

const set = (id: number, exerciseId: number, name: string, category: string, setNumber: number, weight: number, reps: number) => ({
  id,
  exerciseId,
  setNumber,
  subSetNumber: null,
  setType: 'REGULAR',
  weight,
  reps,
  exercise: { id: exerciseId, name, category },
});

export const pushSession = {
  id: 500,
  workoutId: 7,
  startedAt: daysAgo(6),
  completedAt: daysAgo(6),
  createdAt: '',
  updatedAt: '',
  workout: { id: 7, name: 'Push' },
  exerciseSets: [
    set(1, 10, 'Cable Flyes', 'CHEST', 1, 45, 12),
    set(2, 10, 'Cable Flyes', 'CHEST', 2, 45, 12),
    set(3, 10, 'Cable Flyes', 'CHEST', 3, 45, 12),
  ],
  workoutExercises: [pushExercises[0]],
  planInstanceDays: [
    {
      id: 1,
      planInstanceId: 20,
      planDayId: 31,
      planDay: { id: 31, dayNumber: 3 },
      planInstance: { id: 20, planId: 4, iterationNumber: 1, status: 'COMPLETE', rir: 3, plan: { id: 4, name: 'PPL' }, mesocycle: { id: 3, name: 'Meso 3' } },
    },
  ],
};

export const mesoDetail = {
  id: 3,
  name: 'Meso 3',
  status: 'IN_PROGRESS',
  iterations: 5,
  startedAt: daysAgo(14),
  completedAt: null,
  plan: { id: 4, name: 'PPL' },
  instances: [
    {
      id: 20,
      status: 'COMPLETE',
      iterationNumber: 1,
      rir: 3,
      completedAt: daysAgo(7),
      days: [
        { id: 1, isComplete: true, planDay: { isRestDay: false, dayNumber: 1 }, workoutInstance: null },
        { id: 2, isComplete: true, planDay: { isRestDay: false, dayNumber: 2 }, workoutInstance: null },
        { id: 3, isComplete: true, planDay: { isRestDay: false, dayNumber: 3 }, workoutInstance: { id: 500, completedAt: daysAgo(6) } },
      ],
    },
    {
      id: 21,
      status: 'IN_PROGRESS',
      iterationNumber: 2,
      rir: 2,
      completedAt: null,
      days: [
        { id: 10, isComplete: true, planDay: { isRestDay: false, dayNumber: 1 }, workoutInstance: { id: 600, completedAt: daysAgo(2) } },
        { id: 11, isComplete: false, planDay: { isRestDay: true, dayNumber: 2 }, workoutInstance: null },
        { id: 12, isComplete: false, planDay: { isRestDay: false, dayNumber: 3 }, workoutInstance: null },
      ],
    },
  ],
};

/** Eight weekly Push sessions, oldest first, with Cable Flyes rising 2.5 lb a week. */
export function pushHistory(weeks = 8) {
  return Array.from({ length: weeks }, (_, i) => {
    const age = (weeks - 1 - i) * 7;
    const w = 40 + i * 2.5;
    return {
      ...pushSession,
      id: 700 + i,
      startedAt: daysAgo(age),
      completedAt: daysAgo(age),
      exerciseSets: [1, 2, 3].map((n) => ({
        id: 7000 + i * 10 + n,
        exerciseId: 10,
        setNumber: n,
        subSetNumber: null,
        setType: 'REGULAR',
        weight: w,
        reps: 12,
        exercise: { id: 10, name: 'Cable Flyes', category: 'CHEST' },
      })),
      planInstanceDays: [
        {
          ...pushSession.planInstanceDays[0],
          planInstance: { ...pushSession.planInstanceDays[0].planInstance, iterationNumber: i < 4 ? 1 : 2 },
        },
      ],
    };
  });
}

export function cableFlyesDetail(weeks = 8) {
  return {
    id: 10,
    name: 'Cable Flyes',
    category: 'CHEST',
    history: pushHistory(weeks).map((s) => ({
      workoutInstanceId: s.id,
      volume: 0,
      completedAt: s.completedAt,
      sets: s.exerciseSets.map((x) => ({ weight: x.weight, reps: x.reps, setNumber: x.setNumber, subSetNumber: null, setType: 'REGULAR' })),
    })),
  };
}
