import { dayKey } from '../dates';
import { hardSetsInRange, rollingHardSets, rollingWindow, sessionsInRange } from '../volume';
import { at, drop, session, set } from '../__fixtures__/build';
import type { Muscle } from '../types';

const muscleOf = (id: number): Muscle | undefined => ({ 1: 'CHEST', 2: 'BACK' } as Record<number, Muscle>)[id];

// Thursday 17 Sep 2026, mid-week, where an ISO week would hold only four days.
const today = new Date(2026, 8, 17);

describe('rollingWindow', () => {
  it('covers seven whole days ending today', () => {
    const w = rollingWindow(today);
    expect(dayKey(w.from)).toBe('2026-09-11');
    expect(dayKey(w.to)).toBe('2026-09-17');
  });

  it('puts the preceding window immediately before it, without overlap', () => {
    const w = rollingWindow(today, 1);
    expect(dayKey(w.from)).toBe('2026-09-04');
    expect(dayKey(w.to)).toBe('2026-09-10');
  });
});

describe('sessionsInRange', () => {
  it('includes both end days whatever time of day the session finished', () => {
    const sessions = [
      session(at(2026, 9, 10), [set(1, 100, 8)]), // the day before the window
      session(new Date(2026, 8, 11, 23, 30).toISOString(), [set(1, 100, 8)]),
      session(new Date(2026, 8, 17, 6, 15).toISOString(), [set(1, 100, 8)]),
    ];
    const inside = sessionsInRange(sessions, rollingWindow(today));
    expect(inside.map((s) => dayKey(new Date(s.completedAt)))).toEqual(['2026-09-11', '2026-09-17']);
  });
});

describe('hardSetsInRange', () => {
  it('does not count attached sets or sets without reps', () => {
    const sessions = [session(at(2026, 9, 15), [set(1, 100, 8, 1), drop(1, 80, 6, 1), set(1, 100, 0, 2)])];
    expect(hardSetsInRange(sessions, rollingWindow(today), muscleOf).CHEST).toBe(1);
  });

  it('skips unknown exercises', () => {
    const sessions = [session(at(2026, 9, 15), [set(9, 100, 8), set(2, 100, 8)])];
    const rec = hardSetsInRange(sessions, rollingWindow(today), muscleOf);
    expect(rec.BACK).toBe(1);
    expect(Object.values(rec).reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('rollingHardSets', () => {
  it('averages the four windows behind the current one', () => {
    const sessions = [
      session(at(2026, 8, 13), [set(1, 100, 8)]), // the day before the oldest baseline window
      session(at(2026, 8, 14), [set(1, 100, 8), set(1, 100, 8, 2)]), // window 4 opens
      session(at(2026, 9, 10), [set(1, 100, 8), set(1, 100, 8, 2)]), // window 1 closes
      session(at(2026, 9, 15), [set(1, 100, 8)]), // inside the current window
    ];
    const { current, baseline } = rollingHardSets(sessions, today, muscleOf);
    expect(current.CHEST).toBe(1);
    // Two sets in the oldest baseline window and two in the newest: 4 / 4 windows.
    expect(baseline.CHEST).toBe(1);
    expect(baseline.BACK).toBe(0);
  });

  it('spans 28 days of baseline, ending where the current window opens', () => {
    const inside = rollingHardSets([session(at(2026, 9, 10), [set(1, 100, 8)])], today, muscleOf);
    expect(inside.baseline.CHEST).toBe(0.25);
    // Sep 11 belongs to the current window, not the baseline.
    const currentDay = rollingHardSets([session(at(2026, 9, 11), [set(1, 100, 8)])], today, muscleOf);
    expect(currentDay.baseline.CHEST).toBe(0);
    expect(currentDay.current.CHEST).toBe(1);
    // Aug 13 is one day older than the oldest baseline window.
    const older = rollingHardSets([session(at(2026, 8, 13), [set(1, 100, 8)])], today, muscleOf);
    expect(older.baseline.CHEST).toBe(0);
  });

  it('counts a window with no sessions as zero rather than leaving it out', () => {
    const sessions = [session(at(2026, 9, 8), [set(1, 100, 8), set(1, 100, 8, 2), set(1, 100, 8, 3), set(1, 100, 8, 4)])];
    // Four sets in one of the four windows, and nothing in the other three.
    expect(rollingHardSets(sessions, today, muscleOf).baseline.CHEST).toBe(1);
  });

  it('reports the current window it counted', () => {
    const { window } = rollingHardSets([], today, muscleOf);
    expect(dayKey(window.from)).toBe('2026-09-11');
    expect(dayKey(window.to)).toBe('2026-09-17');
  });
});
