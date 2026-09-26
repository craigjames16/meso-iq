import { e1rmSeries } from '../strength';
import { at, exSession, set } from '../__fixtures__/build';

describe('e1rmSeries', () => {
  it('never marks the first point as a PR', () => {
    const series = e1rmSeries([exSession(at(2026, 1, 1), [set(1, 100, 1)])]);
    expect(series).toHaveLength(1);
    expect(series[0].isPR).toBe(false);
  });

  it('does not mark an equal value as a PR', () => {
    const series = e1rmSeries([
      exSession(at(2026, 1, 1), [set(1, 100, 1)]),
      exSession(at(2026, 1, 8), [set(1, 100, 1)]),
    ]);
    expect(series[1].isPR).toBe(false);
  });

  it('marks a strictly higher value as a PR', () => {
    const series = e1rmSeries([
      exSession(at(2026, 1, 1), [set(1, 100, 1)]),
      exSession(at(2026, 1, 8), [set(1, 105, 1)]),
      exSession(at(2026, 1, 15), [set(1, 102, 1)]),
    ]);
    expect(series.map((p) => p.isPR)).toEqual([false, true, false]);
  });

  it('sorts unsorted input by date', () => {
    const series = e1rmSeries([
      exSession(at(2026, 2, 1), [set(1, 120, 1)]),
      exSession(at(2026, 1, 1), [set(1, 100, 1)]),
    ]);
    expect(series.map((p) => p.weight)).toEqual([100, 120]);
    expect(series[1].isPR).toBe(true);
  });

  it('skips sessions with no top set', () => {
    const series = e1rmSeries([exSession(at(2026, 1, 1), [set(1, 100, 20)])]);
    expect(series).toEqual([]);
  });
});
