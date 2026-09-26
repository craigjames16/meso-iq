export type TimeRange = '3m' | '6m' | '12m' | 'all';

export const TIME_RANGES: readonly TimeRange[] = ['3m', '6m', '12m', 'all'];

export const RANGE_LABELS: Record<TimeRange, string> = {
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
  all: 'All time',
};

/** Lower-case form for captions: "last 6 months", "all time". */
export function rangePhrase(range: TimeRange): string {
  return RANGE_LABELS[range].toLowerCase();
}

/** The first moment in the range. "all" starts at the epoch. */
export function rangeStart(range: TimeRange, today: Date): Date {
  if (range === 'all') return new Date(0);
  const months = range === '3m' ? 3 : range === '6m' ? 6 : 12;
  return new Date(today.getFullYear(), today.getMonth() - months, today.getDate());
}
