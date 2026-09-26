import { adherence } from '../consistency';
import type { MesocycleDayInput, MesocycleWeekInput } from '../types';

const day = (dayNumber: number, done: boolean, isRestDay = false): MesocycleDayInput => ({
  dayNumber,
  isRestDay,
  isComplete: done,
  workoutInstanceId: done ? dayNumber : null,
  completedAt: done && !isRestDay ? '2026-09-01T12:00:00.000Z' : null,
});

const week = (n: number, days: MesocycleDayInput[], status: string | null = null): MesocycleWeekInput => ({
  iterationNumber: n,
  rir: 3,
  status,
  days,
});

describe('adherence', () => {
  it('counts skipped earlier days in the current week as missed', () => {
    const result = adherence({ weeks: [week(1, [day(1, false), day(2, false), day(3, true), day(4, false)])] });
    expect(result).toEqual({ done: 1, due: 3, rate: 1 / 3 });
  });

  it('does not count future weeks as due', () => {
    const result = adherence({
      weeks: [week(1, [day(1, true), day(2, true)], 'COMPLETE'), week(2, [day(1, false), day(2, false)])],
    });
    expect(result).toEqual({ done: 2, due: 2, rate: 1 });
  });

  it('ignores rest days', () => {
    const result = adherence({
      weeks: [
        week(1, [day(1, true), day(2, false, true), day(3, false)]),
        week(2, [day(1, true), day(2, false, true), day(3, false)]),
      ],
    });
    // Week 1 is complete (a later week has progress): 1 of 2. Week 2: day 1 due and done.
    expect(result).toEqual({ done: 2, due: 3, rate: 2 / 3 });
  });

  it('has a null rate when nothing is due', () => {
    expect(adherence({ weeks: [week(1, [day(1, false)])] })).toEqual({ done: 0, due: 0, rate: null });
  });
});
