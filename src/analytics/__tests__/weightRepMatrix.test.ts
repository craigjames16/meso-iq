import { matrixCaption, weightRepMatrix } from '../volume';
import { set } from '../__fixtures__/build';

describe('weightRepMatrix', () => {
  it('keeps the most frequent weights when there are more than 6, heaviest first', () => {
    const sets = [
      ...[100, 110, 120, 130, 140, 150].flatMap((w) => [set(1, w, 8), set(1, w, 8)]),
      set(1, 300, 1),
    ];
    const m = weightRepMatrix(sets);
    expect(m.rows).toEqual([150, 140, 130, 120, 110, 100]);
  });

  it('maps non-zero counts to levels 1–4 by quartile', () => {
    // Counts 1..8 in eight cells across two weights.
    const cells: [number, number, number][] = [
      [100, 3, 1], [100, 5, 2], [100, 7, 3], [100, 9, 4],
      [90, 3, 5], [90, 5, 6], [90, 7, 7], [90, 9, 8],
    ];
    const sets = cells.flatMap(([w, reps, n]) => Array.from({ length: n }, () => set(1, w, reps)));
    const m = weightRepMatrix(sets);
    expect(m.counts[0].slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(m.levels[0].slice(0, 4)).toEqual([1, 1, 2, 2]);
    expect(m.levels[1].slice(0, 4)).toEqual([3, 3, 4, 4]);
    expect(m.levels[0][5]).toBe(0);
  });

  it('handles empty input', () => {
    expect(weightRepMatrix([])).toEqual({ rows: [], counts: [], levels: [] });
    expect(matrixCaption([])).toBeNull();
  });

  it('builds the caption from the heaviest weight', () => {
    expect(matrixCaption([set(1, 205, 6), set(1, 205, 4), set(1, 185, 10)])).toBe(
      'You have never lifted 205 lb for more than 6 reps.',
    );
  });
});
