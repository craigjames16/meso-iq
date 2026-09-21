import { e1rm } from '../strength';

describe('e1rm', () => {
  it('returns the weight for a single rep', () => {
    expect(e1rm(225, 1)).toBe(225);
  });

  it('applies the Epley formula', () => {
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 2);
  });
});
