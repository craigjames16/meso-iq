// Display formatting shared by screens and primitives. Analytics functions
// return raw numbers; these helpers round only for display.

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Flat deltas (absolute value under 0.5%) read as no change. */
export const FLAT_DELTA = 0.005;

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(digits);
  const [whole, frac] = fixed.split('.');
  const sign = whole.startsWith('-') ? '−' : '';
  const abs = whole.replace('-', '');
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}${frac ? `.${frac}` : ''}`;
}

/** Compact form for tight cells: 8214 → "8.2k". */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return formatNumber(value);
}

/** Signed percentage from a fraction: 0.031 → "+3.1%", -0.018 → "−1.8%". */
export function formatPercentDelta(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—';
  const pct = fraction * 100;
  if (Math.abs(fraction) < FLAT_DELTA) return `${(0).toFixed(digits)}%`;
  const sign = pct > 0 ? '+' : '−';
  return `${sign}${Math.abs(pct).toFixed(digits)}%`;
}

/** Signed whole-unit delta: 4 → "+4", -3 → "−3". */
export function formatSigned(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return formatNumber(0, digits);
  const sign = value > 0 ? '+' : '−';
  return `${sign}${formatNumber(Math.abs(value), digits)}`;
}

export function formatPercent(fraction: number, digits = 0): string {
  if (!Number.isFinite(fraction)) return '—';
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "Thursday, Sep 17" */
export function formatLongDay(value: string | Date): string {
  const d = toDate(value);
  return `${DAYS_LONG[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Wed, Sep 16" */
export function formatMediumDay(value: string | Date): string {
  const d = toDate(value);
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Wed 16" */
export function formatShortDay(value: string | Date): string {
  const d = toDate(value);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`;
}

/** "Aug 24" */
export function formatMonthDay(value: string | Date): string {
  const d = toDate(value);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Aug 24, 2025" */
export function formatFullDate(value: string | Date): string {
  const d = toDate(value);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function monthShort(month: number): string {
  return MONTHS_SHORT[month] ?? '';
}

export function monthLong(month: number): string {
  return MONTHS_LONG[month] ?? '';
}

export function weekdayLong(day: number): string {
  return DAYS_LONG[day] ?? '';
}

/** "Wed" */
export function weekdayShort(day: number): string {
  return DAYS_SHORT[day] ?? '';
}

/** Whole calendar days between two dates in the device time zone. */
export function calendarDaysBetween(from: string | Date, to: string | Date): number {
  const a = toDate(from);
  const b = toDate(to);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / 86400000);
}

/** "today", "yesterday", "6 days ago" */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** A set weight: whole numbers without decimals, fractional plates kept (57.5, 1,002.5). */
export function formatWeight(weight: number): string {
  if (!Number.isFinite(weight)) return '—';
  const rounded = Math.round(weight * 100) / 100;
  return formatNumber(rounded, Number.isInteger(rounded) ? 0 : rounded * 10 === Math.round(rounded * 10) ? 1 : 2);
}
