import { cycleRadar } from '../volume';
import { at, set } from '../__fixtures__/build';
import type { Muscle } from '../types';

const muscles: Record<number, Muscle> = { 1: 'CHEST', 2: 'BACK', 3: 'QUADS' };
const muscleOf = (id: number) => muscles[id];

describe('cycleRadar', () => {
  it('compares the same week of each cycle and normalises to the largest value', () => {
    const current = {
      sessions: [
        { iteration: 2, completedAt: at(2026, 9, 1), sets: [set(1, 1, 8), set(1, 1, 8), set(2, 1, 8)] },
        { iteration: 1, completedAt: at(2026, 8, 25), sets: [set(3, 1, 8)] },
      ],
    };
    const previous = {
      sessions: [{ iteration: 2, completedAt: at(2026, 6, 1), sets: [set(1, 1, 8), set(1, 1, 8), set(1, 1, 8), set(1, 1, 8)] }],
    };
    const radar = cycleRadar(current, previous, 2, muscleOf);
    expect(radar.axes).toEqual(['BACK', 'CHEST']);
    expect(radar.current).toEqual([0.25, 0.5]);
    expect(radar.previous).toEqual([0, 1]);
  });

  it('uses the last week of a shorter previous cycle', () => {
    const current = { sessions: [{ iteration: 5, completedAt: at(2026, 9, 1), sets: [set(1, 1, 8)] }] };
    const previous = { sessions: [{ iteration: 3, completedAt: at(2026, 6, 1), sets: [set(1, 1, 8), set(1, 1, 8)] }] };
    expect(cycleRadar(current, previous, 5, muscleOf).previous).toEqual([1]);
  });

  it('returns null previous without a previous cycle', () => {
    expect(cycleRadar({ sessions: [] }, null, 1, muscleOf)).toMatchObject({ axes: [], previous: null });
  });
});
