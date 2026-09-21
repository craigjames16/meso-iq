import { monthGrid, monthStarts, recentWeeks } from '../calendar';
import { dayKey } from '../dates';

describe('calendar', () => {
  it('builds the last N weeks, Monday first, with future days empty', () => {
    const weeks = recentWeeks(new Date(2026, 8, 17), 2); // Thursday
    expect(weeks).toHaveLength(2);
    expect(dayKey(weeks[1][0]!)).toBe('2026-09-14');
    expect(weeks[1][3]).not.toBeNull();
    expect(weeks[1][4]).toBeNull();
    expect(dayKey(weeks[0][0]!)).toBe('2026-09-07');
  });

  it('lays out a month with Monday first', () => {
    const rows = monthGrid(2026, 8); // September 2026 starts on a Tuesday
    expect(rows[0][0]).toBeNull();
    expect(rows[0][1]?.getDate()).toBe(1);
    expect(rows.flat().filter(Boolean)).toHaveLength(30);
    expect(rows.every((r) => r.length === 7)).toBe(true);
  });

  it('finds where each month starts in a strip', () => {
    const starts = monthStarts(recentWeeks(new Date(2026, 8, 17), 6));
    expect(starts.map((s) => s.month)).toEqual([7, 8]);
  });
});
