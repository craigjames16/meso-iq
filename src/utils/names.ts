import { muscleLabel } from '../theme/muscles';

const DEFAULT_DAY_NAME = /^(.*) - Day (\d+)$/;

/** True for the API's default day name, "<plan name> - Day N". */
export function isDefaultDayName(name: string | null | undefined): boolean {
  return !!name && DEFAULT_DAY_NAME.test(name);
}

/**
 * A readable name for a plan day's workout. The API names days "<plan> - Day N"
 * until per-day names ship, so those fall back to the day's main muscles
 * ("Chest & Triceps"), then to "Day N".
 */
export function workoutDisplayName(
  name: string | null | undefined,
  muscles: (string | null | undefined)[] = [],
  dayNumber?: number | null,
): string {
  if (name && !isDefaultDayName(name)) return name;
  const counts = new Map<string, number>();
  for (const m of muscles) {
    if (!m) continue;
    const key = m.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => muscleLabel(m));
  if (top.length > 0) return top.join(' & ');
  const match = name ? DEFAULT_DAY_NAME.exec(name) : null;
  const n = dayNumber ?? (match ? Number(match[2]) : null);
  return n != null ? `Day ${n}` : name || 'Workout';
}
