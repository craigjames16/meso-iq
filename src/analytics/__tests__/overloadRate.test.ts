import { fastestRiser, linearFit, muscleOverloadRate, overloadRate } from '../strength';
import { at, point } from '../__fixtures__/build';

const from = new Date(2026, 0, 1);
const to = new Date(2026, 5, 30);

describe('overloadRate', () => {
  it('is null under 3 points', () => {
    expect(overloadRate([point(at(2026, 1, 5), 100), point(at(2026, 1, 12), 110)], from, to)).toBeNull();
  });

  it('is positive for rising data, as a fraction of the mean per week', () => {
    const series = [point(at(2026, 1, 5), 100), point(at(2026, 1, 12), 102), point(at(2026, 1, 19), 104)];
    expect(overloadRate(series, from, to)).toBeCloseTo(2 / 102, 3);
  });

  it('ignores points outside the window', () => {
    const series = [
      point(at(2025, 6, 1), 300),
      point(at(2026, 1, 5), 100),
      point(at(2026, 1, 12), 102),
      point(at(2026, 1, 19), 104),
    ];
    expect(overloadRate(series, from, to)).toBeCloseTo(2 / 102, 3);
  });
});

describe('muscleOverloadRate', () => {
  it('weights each exercise by its points in the window', () => {
    const rising = [point(at(2026, 1, 5), 100), point(at(2026, 1, 12), 102), point(at(2026, 1, 19), 104)];
    const flat = [1, 2, 3, 4, 5, 6].map((i) => point(at(2026, 2, i * 3), 100));
    const rate = muscleOverloadRate([{ series: rising }, { series: flat }], from, to);
    expect(rate).toBeCloseTo(((2 / 102) * 3 + 0 * 6) / 9, 4);
  });

  it('is null when no exercise qualifies', () => {
    expect(muscleOverloadRate([{ series: [] }], from, to)).toBeNull();
  });
});

describe('fastestRiser', () => {
  it('returns the highest positive rate', () => {
    expect(fastestRiser({ CHEST: 0.02, BACK: 0.01, QUADS: null })).toEqual({ muscle: 'CHEST', rate: 0.02 });
  });

  it('returns null when nothing is positive', () => {
    expect(fastestRiser({ CHEST: -0.01, BACK: 0 })).toBeNull();
  });
});

describe('linearFit', () => {
  it('fits a straight line', () => {
    expect(linearFit([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])).toEqual({ slope: 2, intercept: 1 });
  });
});
