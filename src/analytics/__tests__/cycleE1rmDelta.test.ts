import { cycleE1rmDelta } from '../strength';
import { at, set } from '../__fixtures__/build';

describe('cycleE1rmDelta', () => {
  it('skips exercises logged in only one week', () => {
    const result = cycleE1rmDelta({
      sessions: [
        { iteration: 1, completedAt: at(2026, 1, 1), sets: [set(1, 100, 1), set(2, 50, 1)] },
        { iteration: 2, completedAt: at(2026, 1, 8), sets: [set(1, 110, 1)] },
      ],
    });
    expect(result.byExercise.map((e) => e.exerciseId)).toEqual([1]);
    expect(result.average).toBeCloseTo(0.1, 5);
  });

  it('averages exercises without weighting and compares first with latest week', () => {
    const result = cycleE1rmDelta({
      sessions: [
        { iteration: 1, completedAt: at(2026, 1, 1), sets: [set(1, 100, 1), set(2, 200, 1), set(2, 200, 1, 2)] },
        { iteration: 2, completedAt: at(2026, 1, 8), sets: [set(1, 150, 1)] },
        { iteration: 3, completedAt: at(2026, 1, 15), sets: [set(1, 120, 1), set(2, 180, 1)] },
      ],
    });
    // Exercise 1: +20%, exercise 2: −10%.
    expect(result.average).toBeCloseTo(0.05, 5);
  });

  it('returns a null average with no qualifying exercises', () => {
    expect(cycleE1rmDelta({ sessions: [] }).average).toBeNull();
  });
});
