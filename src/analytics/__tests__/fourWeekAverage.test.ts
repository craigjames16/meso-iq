import { emptyMuscleRecord, fourWeekAverage } from '../volume';

const rec = (chest: number) => ({ ...emptyMuscleRecord(), CHEST: chest });

describe('fourWeekAverage', () => {
  it('excludes the current week', () => {
    const weekly = new Map([
      ['2026-W38', rec(100)],
      ['2026-W37', rec(8)],
      ['2026-W36', rec(8)],
      ['2026-W35', rec(8)],
      ['2026-W34', rec(8)],
    ]);
    expect(fourWeekAverage(weekly, '2026-W38').CHEST).toBe(8);
  });

  it('counts empty weeks as zero', () => {
    const weekly = new Map([['2026-W37', rec(12)]]);
    expect(fourWeekAverage(weekly, '2026-W38').CHEST).toBe(3);
  });

  it('crosses a year boundary', () => {
    const weekly = new Map([['2025-W52', rec(4)], ['2026-W01', rec(4)]]);
    expect(fourWeekAverage(weekly, '2026-W02').CHEST).toBe(2);
  });
});
