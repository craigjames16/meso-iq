import { isStalled } from '../strength';
import { at, point } from '../__fixtures__/build';

const series = (values: number[]) => values.map((v, i) => point(at(2026, 1, 1 + i * 7), v));

describe('isStalled', () => {
  it('is false under 4 points', () => {
    expect(isStalled(series([100, 100, 100]))).toBe(false);
  });

  it('is true for a flat series', () => {
    expect(isStalled(series([100, 100, 100, 100]))).toBe(true);
  });

  it('is false for a 0.6% gain', () => {
    expect(isStalled(series([100, 99, 100, 100.6]))).toBe(false);
  });

  it('is true for a 0.4% gain', () => {
    expect(isStalled(series([100, 99, 100, 100.4]))).toBe(true);
  });
});
