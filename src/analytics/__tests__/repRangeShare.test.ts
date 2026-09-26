import { repRangeShare } from '../volume';
import { drop, set } from '../__fixtures__/build';

describe('repRangeShare', () => {
  it('splits buckets at 5, 8, 12, 15 and 16', () => {
    const share = repRangeShare([5, 6, 8, 9, 12, 13, 15, 16].map((r, i) => set(1, 100, r, i + 1)));
    expect(share).toEqual({ '1–5': 1 / 8, '6–8': 2 / 8, '9–12': 2 / 8, '13–15': 2 / 8, '16+': 1 / 8 });
  });

  it('sums to 1 and ignores attached sets and zero-rep sets', () => {
    const share = repRangeShare([set(1, 100, 3), set(1, 100, 10), drop(1, 50, 10, 2), set(1, 100, 0, 3)]);
    expect(Object.values(share).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(share['1–5']).toBe(0.5);
  });

  it('returns zeros with no sets', () => {
    expect(Object.values(repRangeShare([])).every((v) => v === 0)).toBe(true);
  });
});
