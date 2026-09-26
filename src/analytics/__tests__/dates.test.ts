import { dayKey, isoWeekKey, mondayOfWeekKey, shiftWeekKey } from '../dates';

describe('dates', () => {
  it('uses ISO week-numbering years', () => {
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe('2026-W01'); // Thursday
    expect(isoWeekKey(new Date(2027, 0, 1))).toBe('2026-W53'); // Friday
    expect(isoWeekKey(new Date(2024, 11, 30))).toBe('2025-W01'); // Monday
  });

  it('round-trips a week key to its Monday', () => {
    const monday = mondayOfWeekKey('2026-W38');
    expect(dayKey(monday)).toBe('2026-09-14');
    expect(isoWeekKey(monday)).toBe('2026-W38');
  });

  it('shifts week keys across years', () => {
    expect(shiftWeekKey('2026-W01', -1)).toBe('2025-W52');
  });
});
