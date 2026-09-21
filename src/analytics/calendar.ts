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
