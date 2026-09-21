import { topSet } from '../strength';
import { drop, set } from '../__fixtures__/build';

describe('topSet', () => {
  it('ignores attached sets', () => {
    const top = topSet([set(1, 100, 8, 1), drop(1, 200, 8, 1)]);
    expect(top?.weight).toBe(100);
  });

  it('ignores sets over 15 reps', () => {
    const top = topSet([set(1, 100, 5, 1), set(1, 100, 20, 2)]);
    expect(top?.reps).toBe(5);
  });

  it('breaks ties by the heavier set, then the earlier set number', () => {
    // 150 × 1 and 100 × 15 both estimate 150.
    expect(topSet([set(1, 100, 15, 1), set(1, 150, 1, 2)])?.weight).toBe(150);
    expect(topSet([set(1, 100, 10, 3), set(1, 100, 10, 2)])?.setNumber).toBe(2);
  });

  it('returns null when no set is eligible', () => {
    expect(topSet([])).toBeNull();
    expect(topSet([set(1, 0, 10), set(1, 100, 0), drop(1, 50, 10, 1)])).toBeNull();
  });
});
