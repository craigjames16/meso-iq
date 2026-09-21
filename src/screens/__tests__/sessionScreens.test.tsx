import { act } from 'react-test-renderer';
import { WorkoutCompleteScreen } from '../workout/WorkoutCompleteScreen';
import { PastSessionScreen } from '../workout/PastSessionScreen';
import { renderScreen, textOf } from '../../testing/render';
import { daysAgo, mesoDetail, pushExercises } from '../../testing/fixtures';

const mockNestedInstance = {
  id: 600,
  workoutId: 7,
  completedAt: daysAgo(0),
  workout: { id: 7, name: 'Push' },
  planInstanceDays: [
    {
      planDay: { id: 31, dayNumber: 3 },
      planInstance: { id: 21, iterationNumber: 2, rir: 2, mesocycle: { id: 3, name: 'Meso 3' } },
    },
  ],
  workoutExercises: [
    {
      ...pushExercises[0],
      sets: [
        { weight: 50, reps: 12, setNumber: 1, subSetNumber: null, setType: 'DROP_SET' },
        { weight: 40, reps: 8, setNumber: 1, subSetNumber: 1, setType: 'DROP_SET' },
        { weight: 50, reps: 11, setNumber: 2, subSetNumber: null, setType: 'REGULAR' },
      ],
    },
  ],
};

jest.mock('../../services/workoutService', () => ({
  workoutService: {
    getWorkoutInstance: jest.fn(async () => mockNestedInstance),
    getHistory: jest.fn(async () => ({ workoutInstances: [require('../../testing/fixtures').pushSession] })),
    getUpcoming: jest.fn(async () => ({ upcomingDays: [] })),
  },
}));
jest.mock('../../services/exercisesService', () => ({
  exercisesService: {
    getExercises: jest.fn(async () => ({})),
    getExercise: jest.fn(async () => ({
      id: 10,
      name: 'Cable Flyes',
      category: 'CHEST',
      history: [
        {
          workoutInstanceId: 500,
          volume: 1620,
          completedAt: require('../../testing/fixtures').daysAgo(6),
          sets: [
            { weight: 45, reps: 12, setNumber: 1, subSetNumber: null, setType: 'REGULAR' },
            { weight: 45, reps: 12, setNumber: 2, subSetNumber: null, setType: 'REGULAR' },
          ],
        },
      ],
    })),
  },
}));
jest.mock('../../services/mesocyclesService', () => ({
  mesocyclesService: {
    getMesocycle: jest.fn(async () => require('../../testing/fixtures').mesoDetail),
    getMesocycles: jest.fn(async () => [{ id: 3, name: 'Meso 3', status: 'IN_PROGRESS', iterations: 5, plan: { id: 4, name: 'PPL' } }]),
  },
}));

describe('Workout complete', () => {
  it('shows totals, the delta against the last Push, records and the cycle', async () => {
    const r = await renderScreen('WorkoutComplete', WorkoutCompleteScreen, { workoutInstanceId: 600 });
    const text = textOf(r.root);
    expect(text).toContain('Workout complete');
    expect(text).toContain('Push · Meso 3 · Week 2 · Day 3');
    // Two hard sets; tonnage includes the drop: 600 + 320 + 550.
    expect(text).toContain('Sets');
    expect(text).toContain('1,470');
    expect(text).toContain('vs last Push');
    expect(text).toContain('−9.3%');
    expect(text).toContain('PERSONAL RECORDS');
    expect(text).toContain('Est. 1RM 70 lb · +7 lb');
    expect(text).toContain('Top set 50 × 12');
    expect(text).toContain('THIS CYCLE');
    await act(async () => r.unmount());
  });
});

describe('Past session', () => {
  it('shows logged sets read-only, attached sets indented, and an Edit action', async () => {
    const r = await renderScreen('PastSession', PastSessionScreen, { workoutInstanceId: 600 });
    const text = textOf(r.root);
    expect(text).toContain('Push');
    expect(text).toContain('Meso 3 · Week 2 · Day 3');
    expect(text).toContain('Edit');
    expect(text).toContain('Cable Flyes');
    expect(text).toContain('2 sets · 1,470 lb');
    expect(text).toContain('D1');
    expect(text).toContain('40 × 8');
    // Read-only: no checkboxes.
    expect(r.root.findAll((n) => n.props.accessibilityRole === 'checkbox')).toHaveLength(0);
    await act(async () => r.unmount());
  });
});

void mesoDetail;
