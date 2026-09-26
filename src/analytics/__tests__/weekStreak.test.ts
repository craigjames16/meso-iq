import { weekStreak } from '../consistency';
import { at, session, set } from '../__fixtures__/build';

describe('weekStreak', () => {
  const today = new Date(2026, 8, 17); // Thursday, 2026-W38

  it('does not break when the current week is empty', () => {
    const sessions = [session(at(2026, 9, 8), [set(1, 1, 1)]), session(at(2026, 9, 1), [set(1, 1, 1)])];
    expect(weekStreak(sessions, today)).toBe(2);
  });

  it('counts the current week when it has a session', () => {
    const sessions = [session(at(2026, 9, 15), [set(1, 1, 1)]), session(at(2026, 9, 8), [set(1, 1, 1)])];
    expect(weekStreak(sessions, today)).toBe(2);
  });

  it('breaks at a gap week', () => {
    const sessions = [session(at(2026, 9, 15), [set(1, 1, 1)]), session(at(2026, 9, 1), [set(1, 1, 1)])];
    expect(weekStreak(sessions, today)).toBe(1);
  });

  it('is zero with no sessions', () => {
    expect(weekStreak([], today)).toBe(0);
  });
});
