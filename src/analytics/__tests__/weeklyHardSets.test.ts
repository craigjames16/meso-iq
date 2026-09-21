import { weeklyHardSets } from '../volume';
import { at, drop, session, set } from '../__fixtures__/build';
import type { Muscle } from '../types';

const muscleOf = (id: number): Muscle | undefined => ({ 1: 'CHEST', 2: 'BACK' } as Record<number, Muscle>)[id];

describe('weeklyHardSets', () => {
  it('puts a Sunday session in the week that started the Monday before', () => {
    // Sunday 20 Sep 2026 belongs to the week of Monday 14 Sep (2026-W38).
    const weeks = weeklyHardSets([session(at(2026, 9, 20), [set(1, 100, 8)])], muscleOf);
    expect([...weeks.keys()]).toEqual(['2026-W38']);
    const monday = weeklyHardSets([session(at(2026, 9, 14), [set(1, 100, 8)])], muscleOf);
    expect([...monday.keys()]).toEqual(['2026-W38']);
  });

  it('does not count attached sets or sets without reps', () => {
    const weeks = weeklyHardSets(
      [session(at(2026, 9, 15), [set(1, 100, 8, 1), drop(1, 80, 6, 1), set(1, 100, 0, 2)])],
      muscleOf,
    );
    expect(weeks.get('2026-W38')?.CHEST).toBe(1);
  });

  it('skips unknown exercises', () => {
    const weeks = weeklyHardSets([session(at(2026, 9, 15), [set(9, 100, 8), set(2, 100, 8)])], muscleOf);
    const rec = weeks.get('2026-W38')!;
    expect(rec.BACK).toBe(1);
    expect(Object.values(rec).reduce((a, b) => a + b, 0)).toBe(1);
  });
});
