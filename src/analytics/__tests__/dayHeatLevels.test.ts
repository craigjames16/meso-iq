import { dayHeatLevels, daysSinceTrained, heatLevel, sessionsPerWeek } from '../consistency';
import { at, drop, session, set } from '../__fixtures__/build';
import type { Muscle } from '../types';

const n = (count: number) => Array.from({ length: count }, (_, i) => set(1, 100, 8, i + 1));

describe('dayHeatLevels', () => {
  it('maps hard sets to levels at 1, 10 and 18', () => {
    expect([0, 1, 9, 10, 17, 18].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it('keys by local day and sums sessions on the same day', () => {
    const levels = dayHeatLevels(
      [session(at(2026, 9, 1, 8), n(6)), session(at(2026, 9, 1, 18), [...n(6), drop(1, 50, 5, 1)]), session(at(2025, 9, 1), n(20))],
      2026,
    );
    expect(levels.get('2026-09-01')).toBe(2);
    expect(levels.has('2025-09-01')).toBe(false);
  });
});

describe('daysSinceTrained', () => {
  const muscleOf = (id: number): Muscle | undefined => (id === 1 ? 'CHEST' : undefined);

  it('returns calendar days since the last hard set for the muscle', () => {
    const sessions = [session(at(2026, 9, 11, 23), [set(1, 100, 8)])];
    expect(daysSinceTrained(sessions, 'CHEST', new Date(2026, 8, 17, 7), muscleOf)).toBe(6);
  });

  it('returns null when never trained', () => {
    expect(daysSinceTrained([], 'CHEST', new Date(), muscleOf)).toBeNull();
  });
});

describe('sessionsPerWeek', () => {
  it('averages sessions over the weeks in range', () => {
    const sessions = [session(at(2026, 9, 2), n(1)), session(at(2026, 9, 9), n(1)), session(at(2026, 9, 10), n(1))];
    expect(sessionsPerWeek(sessions, new Date(2026, 8, 1), new Date(2026, 8, 15))).toBeCloseTo(1.5, 5);
  });
});
