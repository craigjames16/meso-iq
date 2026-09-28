import { act } from 'react-test-renderer';
import { DataScreen } from '../main/DataScreen';
import { HeatmapScreen } from '../main/HeatmapScreen';
import { byLabel, press, renderScreen, textOf, unlabelledPressables } from '../../testing/render';

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
jest.mock('../../services/mesocyclesService', () => ({
  mesocyclesService: {
    getMesocycle: jest.fn(async () => require('../../testing/fixtures').mesoDetail),
    getMesocycles: jest.fn(async () => [{ id: 3, name: 'Meso 3', status: 'IN_PROGRESS', iterations: 5, plan: { id: 4, name: 'PPL' } }]),
  },
}));

async function openTab(label: string) {
  const r = await renderScreen('Data', DataScreen, undefined, { Heatmap: HeatmapScreen });
  const tab = r.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.props.onPress === 'function' && textOf(n) === label)[0];
  await press(tab);
  return r;
}

describe('Data tab', () => {
  it('Cycle shows the cycle position, working sets, and strength trend', async () => {
    const r = await openTab('Cycle');
    const text = textOf(r.root);
    expect(text).toContain('WEEK 2 OF 5 · RIR 2');
    expect(text).toContain('PPL · 4 of 5 days logged');
    expect(text).toContain('Working sets, last 7 days');
    expect(text).toContain('CHEST');
    expect(text).toContain('Strength trend');
    expect(text).toContain('Cable Flyes');
    expect(text).toContain('Epley estimate from the heaviest working set each session.');
    expect(text).not.toMatch(/NaN|undefined/);
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('Progress shows the e1RM hero, records, matrix and rep ranges', async () => {
    const r = await openTab('Progress');
    const text = textOf(r.root);
    expect(text).toContain('Last 6 months');
    expect(text).toContain('Cable Flyes');
    expect(text).toMatch(/Est\. 1RM · 8 sessions since/);
    // 57.5 × 12 → 80.5; 40 × 12 → 56: +25 lb (+44%).
    expect(text).toContain('81');
    expect(text).toContain('+25 lb (+44%)');
    expect(text).toContain('THIS EXERCISE');
    expect(text).toContain('RECORDS');
    expect(text).toContain('57.5 × 12');
    expect(text).toContain('12 × 57.5');
    expect(text).toContain('Where you actually train');
    expect(text).toContain('You have never lifted 57.5 lb for more than 12 reps.');
    expect(text).toContain('ACROSS ALL EXERCISES');
    expect(text).toContain('Rep ranges');
    expect(text).toContain('100%');
    expect(text).toContain('Est. 1RM change per week · last 6 months');
    expect(text).not.toMatch(/NaN|undefined/);
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('History shows consistency, volume, mesocycles, sessions and all-time totals', async () => {
    const r = await openTab('History');
    const text = textOf(r.root);
    expect(text).toContain('Consistency');
    expect(text).toContain('Last 26 weeks');
    expect(text).toContain('Volume per month');
    expect(text).toContain('MESOCYCLES');
    expect(text).toContain('Meso 3 · PPL');
    expect(text).toContain('ACTIVE');
    expect(text).toContain('SESSIONS');
    expect(text).toContain('ALL TIME');
    expect(text).toContain('Exercises used');
    expect(text).not.toMatch(/NaN|undefined/);
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('the tab header carries the MesoIQ mark', async () => {
    const r = await openTab('Cycle');
    // One mark per screen: react-test-renderer reports the component and its host nodes.
    const marks = r.root.findAll((n) => n.props.accessibilityLabel === 'MesoIQ' && typeof n.type === 'string');
    expect(marks.length).toBe(1);
    await act(async () => r.unmount());
  });

  it('a chart info button opens a sheet defining the metric', async () => {
    const r = await openTab('Cycle');
    await press(byLabel(r.root, 'About Working sets, last 7 days'));
    const text = textOf(r.root);
    expect(text).toContain('Each bar is the number of working sets you have logged for that muscle over the last 7 days, today included.');
    expect(text).toContain('Tick');
    expect(text).toContain('Your average for that muscle over the four 7-day windows before this one');
    await act(async () => r.unmount());
  });
});

describe('Consistency screen', () => {
  it('renders twelve month calendars and the key', async () => {
    const r = await renderScreen('Heatmap', HeatmapScreen, { year: new Date().getFullYear() });
    const text = textOf(r.root);
    for (const m of ['JAN', 'JUN', 'DEC']) expect(text).toContain(m);
    expect(text).toContain('Current streak');
    expect(text).toContain('Big day');
    expect(text).toContain("Shade is that day's working sets. Tap a day to open the session.");
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });
});
