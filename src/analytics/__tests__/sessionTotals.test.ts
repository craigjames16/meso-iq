import { allTimeTotals, previousSameWorkout, sessionTotals, tonnageDeltaVsLast } from '../volume';
import { at, drop, session, set } from '../__fixtures__/build';

describe('session totals and deltas', () => {
  const a = session(at(2026, 9, 1), [set(1, 100, 10)], { workoutId: 7 });
  const b = session(at(2026, 9, 8), [set(1, 100, 10), drop(1, 50, 4, 1)], { workoutId: 7 });
  const other = session(at(2026, 9, 5), [set(2, 100, 10)], { workoutId: 8 });

  it('counts hard sets and includes attached sets in tonnage', () => {
    expect(sessionTotals(b)).toEqual({ hardSets: 1, tonnage: 1200 });
  });

  it('finds the previous session of the same workout', () => {
    expect(previousSameWorkout(b, [a, b, other])?.workoutInstanceId).toBe(a.workoutInstanceId);
    expect(previousSameWorkout(a, [a, b, other])).toBeNull();
  });

  it('computes the fractional tonnage change', () => {
    expect(tonnageDeltaVsLast(b, [a, b, other])).toBeCloseTo(0.2, 10);
    expect(tonnageDeltaVsLast(a, [a, b])).toBeNull();
  });

  it('totals all time', () => {
    expect(allTimeTotals([a, b, other])).toEqual({ tonnage: 3200, sets: 3, sessions: 3, exercises: 2 });
  });
});
