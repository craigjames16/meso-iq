import { act } from 'react-test-renderer';
import { PlanScreen } from '../main/PlanScreen';
import { PlanDetailScreen } from '../plan/PlanDetailScreen';
import { EditPlanScreen } from '../plan/EditPlanScreen';
import { MesocycleDetailScreen } from '../mesocycle/MesocycleDetailScreen';
import { ExerciseDetailScreen } from '../exercise/ExerciseDetailScreen';
import { press, pressText, renderScreen, textOf, unlabelledPressables } from '../../testing/render';
import { plansService } from '../../services/plansService';

jest.mock('../../services/workoutService', () => ({
  workoutService: {
    getHistory: jest.fn(async () => ({ workoutInstances: require('../../testing/fixtures').pushHistory() })),
    getUpcoming: jest.fn(async () => ({ upcomingDays: [] })),
  },
}));
jest.mock('../../services/exercisesService', () => ({
  exercisesService: {
    getExercises: jest.fn(async () => ({ CHEST: [{ id: 10, name: 'Cable Flyes', category: 'CHEST', highestWeight: 0 }] })),
    getExercise: jest.fn(async () => require('../../testing/fixtures').cableFlyesDetail()),
  },
}));
jest.mock('../../services/plansService', () => ({
  plansService: {
    getPlans: jest.fn(async () => [require('../../testing/fixtures').pplPlan, require('../../testing/fixtures').emptyPlan]),
    getPlan: jest.fn(async () => require('../../testing/fixtures').pplPlan),
    updatePlan: jest.fn(async () => ({})),
    createPlan: jest.fn(async () => ({ id: 9 })),
  },
}));
jest.mock('../../services/mesocyclesService', () => ({
  mesocyclesService: {
    getMesocycle: jest.fn(async () => require('../../testing/fixtures').mesoDetail),
    getMesocycles: jest.fn(async () => [{ id: 3, name: 'Meso 3', status: 'IN_PROGRESS', iterations: 5, plan: { id: 4, name: 'PPL' } }]),
  },
}));

const noop = () => null;

describe('Plan tab', () => {
  it('shows the active cycle, programs with a running tag, and drafts', async () => {
    const r = await renderScreen('Plan', PlanScreen);
    const text = textOf(r.root);
    expect(text).toContain('ACTIVE CYCLE');
    expect(text).toContain('Week 2 of 5');
    expect(text).toContain('Meso 3 · PPL');
    expect(text).toContain('4 of 5 days logged');
    expect(text).toContain('RUNNING');
    expect(text).toContain('2 training days · 5 exercises');
    expect(text).toContain('1 empty draft');
    expect(text).toContain('“Chest/Arms”');
    expect(text).not.toMatch(/NaN|undefined/);
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('shows program detail with the profile, collapsed rest days and a blocked start', async () => {
    const r = await renderScreen('PlanDetail', PlanDetailScreen, { planId: 4 });
    const text = textOf(r.root);
    expect(text).toContain('2 training days · 2 rest · 5 exercises');
    expect(text).toContain('STARTING SETS PER MUSCLE · WEEK 1');
    expect(text).toContain('Chest & Triceps');
    expect(text).toContain('Days 2 & 3 Rest');
    expect(text).toContain('Finish Meso 3 first.');
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('saves the builder with the current payload shape', async () => {
    const r = await renderScreen('EditPlan', EditPlanScreen, { planId: 4 }, { PlanDetail: noop });
    const text = textOf(r.root);
    expect(text).toContain('Edit program');
    expect(text).toContain('AS YOU BUILD IT');
    expect(text).toContain('2 days · 5 exercises · 10 starting sets');
    expect(text).toContain('Back gets 2 sets a week. Most muscles need 8 or more to grow.');
    await pressText(r.root, 'Save program');
    expect(plansService.updatePlan).toHaveBeenCalledWith(4, {
      name: 'PPL',
      days: [
        { isRestDay: false, workoutExercises: [{ id: 10, order: 1 }, { id: 12, order: 2 }, { id: 13, order: 3 }, { id: 14, order: 4 }] },
        { isRestDay: true, workoutExercises: [] },
        { isRestDay: true, workoutExercises: [] },
        { isRestDay: false, workoutExercises: [{ id: 20, order: 1 }] },
      ],
    });
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('blocks saving a new program with no exercises', async () => {
    const r = await renderScreen('EditPlan', EditPlanScreen, {});
    expect(textOf(r.root)).toContain('New program');
    await pressText(r.root, 'Save program');
    expect(plansService.createPlan).not.toHaveBeenCalled();
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });
});

describe('Mesocycle and exercise detail', () => {
  it('shows the cycle progress and week by week', async () => {
    const r = await renderScreen('MesocycleDetail', MesocycleDetailScreen, { mesocycleId: 3 });
    const text = textOf(r.root);
    expect(text).toContain('Meso 3');
    expect(text).toContain('RUNNING');
    expect(text).toContain('4 of 5 days logged');
    expect(text).toContain('WEEK BY WEEK');
    expect(text).toContain('RIR 3');
    expect(text).toContain('Finish cycle early');
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('shows the lift, records, sessions and programs it is used in', async () => {
    const r = await renderScreen('ExerciseDetail', ExerciseDetailScreen, { exerciseId: 10 });
    let text = textOf(r.root);
    expect(text).toContain('Cable Flyes');
    expect(text).toContain('8 sessions · last today');
    expect(text).toContain('ESTIMATED 1RM');
    expect(text).toContain('Every session');
    expect(text).toContain('USED IN 1 PROGRAM');
    expect(text).toContain('PPL · Day 1');
    const vol = r.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.props.onPress === 'function' && textOf(n) === 'Vol')[0];
    await press(vol);
    text = textOf(r.root);
    expect(text).not.toMatch(/NaN|undefined/);
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });
});
