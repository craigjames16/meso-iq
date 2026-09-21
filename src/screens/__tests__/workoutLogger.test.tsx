import { act } from 'react-test-renderer';
import { WorkoutDetailScreen } from '../workout/WorkoutDetailScreen';
import { byLabel, flush, press, pressText, renderScreen, textOf } from '../../testing/render';
import { workoutService } from '../../services/workoutService';

jest.mock('../../services/workoutService', () => {
  let nextId = 1000;
  return {
    workoutService: {
      getWorkoutInstance: jest.fn(async () => ({
        id: 55,
        workoutId: 7,
        completedAt: null,
        workout: { id: 7, name: 'Legs' },
        planInstanceDays: [
          {
            planDay: { id: 1, dayNumber: 5 },
            planInstance: { id: 2, iterationNumber: 1, rir: 2, mesocycle: { id: 3, name: 'Sept-3D' }, plan: { id: 4, name: 'PPL' } },
          },
        ],
        workoutExercises: [
          {
            exerciseId: 10,
            order: 0,
            exercise: { id: 10, name: 'Seated Leg Curls' },
            sets: [{ id: 900, setNumber: 1, subSetNumber: null, setType: 'REGULAR', weight: 130, reps: 15 }],
          },
        ],
      })),
      addSet: jest.fn(async () => [{ id: ++nextId }]),
      deleteSet: jest.fn(async () => undefined),
      convertSetType: jest.fn(async () => ({})),
      getHistory: jest.fn(async () => ({ workoutInstances: [] })),
      completeWorkout: jest.fn(async () => ({})),
    },
  };
});

jest.mock('../../services/exercisesService', () => ({
  exercisesService: {
    getExercise: jest.fn(async () => ({
      id: 10,
      name: 'Seated Leg Curls',
      category: 'HAMSTRINGS',
      history: [
        {
          workoutInstanceId: 40,
          volume: 0,
          completedAt: '2026-09-10T12:00:00.000Z',
          sets: [
            { setNumber: 1, subSetNumber: null, weight: 130, reps: 14 },
            { setNumber: 2, subSetNumber: null, weight: 130, reps: 13 },
            { setNumber: 3, subSetNumber: null, weight: 130, reps: 13 },
          ],
        },
      ],
    })),
    getExercises: jest.fn(async () => ({})),
  },
}));

const mocked = workoutService as jest.Mocked<typeof workoutService>;

describe('Workout logger', () => {
  it('logs sets, converts to a drop set and keeps numbering sequential', async () => {
    const r = await renderScreen('WorkoutDetail', WorkoutDetailScreen, { workoutInstanceId: 55 });
    let text = textOf(r.root);
    expect(text).toContain('Legs');
    expect(text).toContain('Sept-3D · Week 1 · Day 5');
    expect(text).toContain('TARGET RIR 2');
    expect(text).toContain('Finish workout · 1 of 3 sets');
    expect(text).toContain('Last 130 × 14');

    // Step 1: check set 2 with nothing typed. It logs last time's weight and one more rep.
    await press(byLabel(r.root, 'Mark set 2 logged'));
    expect(mocked.addSet).toHaveBeenLastCalledWith(55, 10, 130, 14, 2, null, 'REGULAR');
    expect(textOf(r.root)).toContain('Finish workout · 2 of 3 sets');

    // Step 2: make set 2 a drop set. A D1 row appears and the saved set is retyped.
    await press(byLabel(r.root, 'Set 2 options'));
    const radios = r.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    await press(radios[1]);
    expect(mocked.convertSetType).toHaveBeenCalledWith(55, 1001, 'DROP_SET');
    text = textOf(r.root);
    expect(text).toContain('D1');
    expect(text).toContain('+ Add drop');

    // Step 3: add a second drop and check both.
    await pressText(r.root, '+ Add drop');
    expect(textOf(r.root)).toContain('D2');
    await press(byLabel(r.root, 'Mark set D1 logged'));
    await press(byLabel(r.root, 'Mark set D2 logged'));
    expect(mocked.addSet).toHaveBeenCalledWith(55, 10, expect.any(Number), expect.any(Number), 2, 2, 'DROP_SET');
    // Attached sets don't count toward progress.
    expect(textOf(r.root)).toContain('Finish workout · 2 of 3 sets');

    // Step 5: duplicate set 1. Saved sets below it move down a number, so they're re-posted.
    mocked.addSet.mockClear();
    mocked.deleteSet.mockClear();
    await press(byLabel(r.root, 'Set 1 options'));
    await pressText(r.root, 'Duplicate set');
    expect(mocked.deleteSet).toHaveBeenCalledTimes(1);
    const reposted = mocked.addSet.mock.calls.map((c) => [c[4], c[5]]);
    expect(reposted).toEqual(expect.arrayContaining([[3, null], [3, 1], [3, 2]]));
    text = textOf(r.root);
    expect(text).toContain('Finish workout · 2 of 4 sets');

    // Step 6: delete the duplicate. Numbering closes the gap.
    mocked.addSet.mockClear();
    await press(byLabel(r.root, 'Set 2 options'));
    await pressText(r.root, 'Delete set');
    const moved = mocked.addSet.mock.calls.map((c) => [c[4], c[5]]);
    expect(moved).toEqual(expect.arrayContaining([[2, null], [2, 1], [2, 2]]));
    expect(textOf(r.root)).toContain('Finish workout · 2 of 3 sets');

    await act(async () => r.unmount());
    await flush(1);
  });
});
