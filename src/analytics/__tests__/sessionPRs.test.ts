import { sessionPRs } from '../strength';
import { at, exSession, session, set } from '../__fixtures__/build';

describe('sessionPRs', () => {
  const history = [
    exSession(at(2026, 1, 1), [set(1, 100, 8)]),
    exSession(at(2026, 1, 8), [set(1, 105, 8)]),
  ];

  it('reports an e1RM record with its gain over the previous best', () => {
    const current = session(at(2026, 1, 15), [set(1, 110, 8)]);
    const prs = sessionPRs(current, [history]);
    expect(prs).toHaveLength(1);
    expect(prs[0].kind).toBe('e1rm');
    expect(prs[0].delta).toBeCloseTo(5 * (1 + 8 / 30), 5);
  });

  it('reports reps at weight when e1RM did not improve', () => {
    // 90 × 12 estimates 126, below 105 × 8 (133), but beats every earlier set at 90 or heavier.
    const current = session(at(2026, 1, 15), [set(1, 105, 8, 1), set(1, 90, 12, 2)]);
    const prs = sessionPRs(current, [history]);
    expect(prs).toEqual([{ exerciseId: 1, kind: 'repsAtWeight', value: 12, weight: 90 }]);
  });

  it('ignores exercises with no earlier session and sessions after the current one', () => {
    const current = session(at(2026, 1, 15), [set(2, 50, 10)]);
    expect(sessionPRs(current, [history])).toEqual([]);
    const early = session(at(2025, 12, 1), [set(1, 100, 8)]);
    expect(sessionPRs(early, [history])).toEqual([]);
  });
});
