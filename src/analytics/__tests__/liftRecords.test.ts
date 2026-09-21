import { liftRecords } from '../strength';
import { at, drop, exSession, set } from '../__fixtures__/build';

describe('liftRecords', () => {
  it('breaks heaviest ties by more reps and most-reps ties by more weight', () => {
    const records = liftRecords([
      exSession(at(2026, 1, 1), [set(1, 200, 3, 1), set(1, 100, 12, 2)]),
      exSession(at(2026, 1, 8), [set(1, 200, 5, 1), set(1, 120, 12, 2)]),
    ]);
    expect(records.heaviest).toMatchObject({ weight: 200, reps: 5 });
    expect(records.mostReps).toMatchObject({ weight: 120, reps: 12 });
  });

  it('uses main sets for heaviest and most reps', () => {
    const records = liftRecords([exSession(at(2026, 1, 1), [set(1, 100, 8, 1), drop(1, 300, 20, 1)])]);
    expect(records.heaviest?.weight).toBe(100);
    expect(records.mostReps?.reps).toBe(8);
  });

  it('includes drop sets in best session volume', () => {
    const records = liftRecords([exSession(at(2026, 1, 1), [set(1, 100, 10, 1), drop(1, 50, 10, 1)])]);
    expect(records.bestSessionVolume?.volume).toBe(1500);
  });

  it('returns nulls for no sessions', () => {
    expect(liftRecords([])).toEqual({ heaviest: null, mostReps: null, bestSessionVolume: null, bestE1rm: null });
  });
});
