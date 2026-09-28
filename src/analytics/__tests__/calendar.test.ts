import { monthGrid, monthStarts, planWeekDates, recentWeeks } from '../calendar';
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

describe('planWeekDates', () => {
  const at = (day: number) => new Date(2026, 8, day, 18, 30).toISOString();
  const week = [
    { dayNumber: 1, completedAt: at(14) }, // Monday
    { dayNumber: 2, completedAt: at(16) }, // Wednesday, a day later than planned
    { dayNumber: 3, completedAt: null },
    { dayNumber: 4, completedAt: null },
  ];

  it('uses each finished day\'s own date and projects the rest from today', () => {
    const dates = planWeekDates(week, new Date(2026, 8, 17), 3); // Thursday, day 3 is up next
    expect(dayKey(dates.get(1)!.date)).toBe('2026-09-14');
    expect(dates.get(1)!.projected).toBe(false);
    expect(dayKey(dates.get(2)!.date)).toBe('2026-09-16');
    expect(dayKey(dates.get(3)!.date)).toBe('2026-09-17');
    expect(dates.get(3)!.projected).toBe(false); // today's slot is a known date
    expect(dayKey(dates.get(4)!.date)).toBe('2026-09-18');
    expect(dates.get(4)!.projected).toBe(true);
  });

  it('anchors on the latest finished day when no day is up next', () => {
    const dates = planWeekDates(week, new Date(2026, 8, 20), null);
    // Day 2 finished on the 16th, so day 3 projects to the 17th, not to today.
    expect(dayKey(dates.get(3)!.date)).toBe('2026-09-17');
    expect(dayKey(dates.get(4)!.date)).toBe('2026-09-18');
  });

  it('projects backwards over skipped days', () => {
    const dates = planWeekDates(
      [
        { dayNumber: 1, completedAt: null },
        { dayNumber: 2, completedAt: null },
        { dayNumber: 3, completedAt: null },
      ],
      new Date(2026, 8, 17),
      2,
    );
    expect(dayKey(dates.get(1)!.date)).toBe('2026-09-16');
    expect(dayKey(dates.get(3)!.date)).toBe('2026-09-18');
  });

  it('has no dates when nothing fixes the rotation to the calendar', () => {
    const dates = planWeekDates([{ dayNumber: 1, completedAt: null }], new Date(2026, 8, 17), null);
    expect(dates.size).toBe(0);
  });
});
