import { addDays, mondayOf, startOfDay } from './dates';

/**
 * The last `weeks` ISO weeks ending with the week of `end`, oldest first.
 * Each week lists its seven days, Monday first. Days after `end` are null.
 */
export function recentWeeks(end: Date, weeks: number): (Date | null)[][] {
  const lastMonday = mondayOf(end);
  const today = startOfDay(end).getTime();
  const out: (Date | null)[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const monday = addDays(lastMonday, -7 * w);
    out.push(Array.from({ length: 7 }, (_, d) => {
      const day = addDays(monday, d);
      return day.getTime() > today ? null : day;
    }));
  }
  return out;
}

/** Calendar rows for one month, Monday first. Cells outside the month are null. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** Evenly spaced month labels for a strip of weeks: [column index, month]. */
export function monthStarts(weeks: (Date | null)[][]): { index: number; month: number }[] {
  const out: { index: number; month: number }[] = [];
  weeks.forEach((week, i) => {
    const firstDay = week.find((d): d is Date => d != null);
    if (!firstDay) return;
    const month = firstDay.getMonth();
    if (out.length === 0 || out[out.length - 1].month !== month) out.push({ index: i, month });
  });
  return out;
}

export interface PlanDayDate {
  /** The calendar day the slot fell on, or is expected to fall on. */
  date: Date;
  /** True when the date is projected forward rather than read from a finished session. */
  projected: boolean;
}

/**
 * Calendar dates for one plan week's day slots, keyed by `dayNumber`.
 *
 * Plan days are slots in a rotation, not weekdays, and the API stores no
 * scheduled date for them. A finished day carries its own date. The rest are
 * projected one calendar day per slot from an anchor: `currentDayNumber` on
 * `today` when there is one, otherwise the latest finished day. With neither,
 * the map is empty, because nothing fixes the rotation to the calendar.
 */
export function planWeekDates(
  days: { dayNumber: number; completedAt: string | null }[],
  today: Date,
  currentDayNumber: number | null,
): Map<number, PlanDayDate> {
  const out = new Map<number, PlanDayDate>();
  const done = days
    .filter((d) => d.completedAt != null)
    .map((d) => ({ dayNumber: d.dayNumber, date: startOfDay(new Date(d.completedAt!)) }));
  for (const d of done) out.set(d.dayNumber, { date: d.date, projected: false });

  const latest = done.reduce<(typeof done)[number] | null>((a, b) => (!a || b.dayNumber > a.dayNumber ? b : a), null);
  const anchor =
    currentDayNumber != null
      ? { dayNumber: currentDayNumber, date: startOfDay(today) }
      : latest
        ? { dayNumber: latest.dayNumber, date: latest.date }
        : null;
  if (!anchor) return out;

  for (const d of days) {
    if (out.has(d.dayNumber)) continue;
    const offset = d.dayNumber - anchor.dayNumber;
    // The anchor slot sits on a known date; only the slots around it are projected.
    out.set(d.dayNumber, { date: addDays(anchor.date, offset), projected: offset !== 0 });
  }
  return out;
}
