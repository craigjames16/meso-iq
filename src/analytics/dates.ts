// Calendar helpers. Weeks are ISO weeks starting Monday, in the device time zone.

const DAY_MS = 86400000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return out;
}

/** Monday of the week containing `d`. */
export function mondayOf(d: Date): Date {
  const day = startOfDay(d);
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

/** ISO week key, "YYYY-Www". A Sunday belongs to the week that started the Monday before. */
export function isoWeekKey(d: Date): string {
  const thursday = addDays(mondayOf(d), 3);
  const year = thursday.getFullYear();
  const firstThursday = addDays(mondayOf(new Date(year, 0, 4)), 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Monday of an ISO week key. */
export function mondayOfWeekKey(key: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid ISO week key: ${key}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  return addDays(mondayOf(new Date(year, 0, 4)), (week - 1) * 7);
}

/** The key of the week `offset` weeks after `key` (negative for earlier). */
export function shiftWeekKey(key: string, offset: number): string {
  return isoWeekKey(addDays(mondayOfWeekKey(key), offset * 7));
}

/** "YYYY-MM-DD" in the device time zone. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole calendar days from `from` to `to`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function weeksBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (7 * DAY_MS);
}
