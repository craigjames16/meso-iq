import { act } from 'react-test-renderer';
import { TrackScreen } from '../main/TrackScreen';
import { press, pressText, renderScreen, textOf } from '../../testing/render';
import { meso, pushSession, upcomingPush } from '../../testing/fixtures';
import { workoutService } from '../../services/workoutService';
import { plansService } from '../../services/plansService';

jest.mock('../../services/workoutService', () => ({
  workoutService: {
    getLatestWorkout: jest.fn(),
    getUpcoming: jest.fn(async () => ({ upcomingDays: [] })),
    getHistory: jest.fn(async () => ({ workoutInstances: [] })),
    getWorkoutInstance: jest.fn(),
    createStandaloneWorkout: jest.fn(async () => ({ id: 900 })),
    addExercise: jest.fn(async () => ({})),
  },
}));
jest.mock('../../services/exercisesService', () => ({ exercisesService: { getExercises: jest.fn(async () => ({})) } }));
jest.mock('../../services/plansService', () => ({ plansService: { getPlans: jest.fn(async () => []) } }));
jest.mock('../../services/mesocyclesService', () => ({
  mesocyclesService: {
    getMesocycle: jest.fn(async () => require('../../testing/fixtures').mesoDetail),
    getMesocycles: jest.fn(async () => [{ id: 3, name: 'Meso 3', status: 'IN_PROGRESS', iterations: 5, plan: { id: 4, name: 'PPL' } }]),
  },
}));
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: '1', email: 'craig@example.com', name: null } }) }));

const ws = workoutService as jest.Mocked<typeof workoutService>;

async function render() {
  const r = await renderScreen('Track', TrackScreen);
  return r;
}

describe('Today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Session caches persist across tests in a file; each test gets fresh modules.
  });

  it('shows the next plan day with a carry-over line from the last session of that workout', async () => {
    ws.getLatestWorkout.mockResolvedValue({ inProgress: false, mesocycleId: 3, mesocycle: meso } as any);
    ws.getUpcoming.mockResolvedValue({ upcomingDays: [upcomingPush] } as any);
    ws.getHistory.mockResolvedValue({ workoutInstances: [pushSession] } as any);
    const r = await render();
    const text = textOf(r.root);
    expect(text).toContain('MESO 3 · WEEK 2 · DAY 3');
    expect(text).toContain('Push');
    expect(text).toContain('PPL · 4 exercises · 9 sets');
    expect(text).toContain('+1');
    expect(text).toContain('Last Push was 6 days ago at 1,620 lb. Opening set target: Cable Flyes 3 × 12 @ 45 lb.');
    expect(text).toContain('TODAY HITS');
    expect(text).toContain('This week');
    expect(text).toContain('1 of 2 done');
    expect(text).toContain('Recent');
    expect(text).toContain('Day 3 · Push');
    expect(text).toContain('1 WK');
    expect(text).not.toMatch(/min|timer|duration/i);
    await act(async () => r.unmount());
  });

  it('shows the new-account hero and hides the history sections', async () => {
    ws.getLatestWorkout.mockResolvedValue(null);
    ws.getHistory.mockResolvedValue({ workoutInstances: [] } as any);
    (plansService.getPlans as jest.Mock).mockResolvedValue([]);
    const r = await render();
    const text = textOf(r.root);
    expect(text).toContain('Build your first program');
    expect(text).not.toContain('Recent');
    expect(text).not.toContain('This week');
    expect(text).toContain('Log something off-plan');
    await act(async () => r.unmount());
  });
});

describe('Today variants', () => {
  it('offers to resume an in-progress workout with its logged set count', async () => {
    ws.getLatestWorkout.mockResolvedValue({
      inProgress: true,
      workoutInstanceId: 77,
      workoutName: 'Legs',
      mesocycleId: 3,
      mesocycle: meso,
      iterationNumber: 2,
      dayNumber: 3,
    } as any);
    ws.getWorkoutInstance.mockResolvedValue({
      id: 77,
      workoutExercises: [{ exercise: { category: 'QUADS' }, sets: [{ subSetNumber: null, reps: 8 }, { subSetNumber: 1, reps: 5 }] }],
    });
    const r = await render();
    const text = textOf(r.root);
    expect(text).toContain('Legs');
    expect(text).toContain('Resume · 1 set logged');
    await act(async () => r.unmount());
  });

  it('asks to start a cycle when none is running', async () => {
    ws.getLatestWorkout.mockResolvedValue({ inProgress: false } as any);
    ws.getHistory.mockResolvedValue({ workoutInstances: [pushSession] } as any);
    const r = await render();
    expect(textOf(r.root)).toContain('No cycle running');
    expect(textOf(r.root)).toContain('Start a cycle');
    await act(async () => r.unmount());
  });
});

describe('Off-plan sheet', () => {
  it('repeats a past session as a standalone workout with the same exercises', async () => {
    ws.getLatestWorkout.mockResolvedValue({ inProgress: false } as any);
    ws.getHistory.mockResolvedValue({ workoutInstances: [pushSession] } as any);
    const r = await render();
    await pressText(r.root, 'Log something off-plan');
    const text = textOf(r.root);
    expect(text).toContain("Counts toward your data, not your cycle's adherence");
    expect(text).toContain('Repeat a past session');
    expect(text).toContain('Pick a day from a program');
    await press(r.root.findAll((n) => typeof n.props.onPress === 'function' && textOf(n).trim() === 'Start workout').pop()!);
    expect(ws.createStandaloneWorkout).toHaveBeenCalledWith('Push');
    expect(ws.addExercise).toHaveBeenCalledWith(900, [10]);
    await act(async () => r.unmount());
  });
});

