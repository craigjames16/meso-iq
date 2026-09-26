// Program and cycle planning helpers.

export interface RampWeek {
  week: number;
  rir: number | null;
  deload: boolean;
}

/**
 * The RIR the API assigns each week when a mesocycle is created:
 * min(3, iterations − week). For 5 weeks that's 3, 3, 2, 1, 0. The API has
 * no deload flag yet; see docs/redesign/04-backend.md#rir-ramp.
 */
export function rirRamp(weeks: number): RampWeek[] {
  return Array.from({ length: weeks }, (_, i) => {
    const week = i + 1;
    return { week, rir: Math.min(3, weeks - week), deload: false };
  });
}

export const MIN_CYCLE_WEEKS = 3;
export const MAX_CYCLE_WEEKS = 8;
export const DEFAULT_CYCLE_WEEKS = 5;

/** "8–12 reps", "10 reps", or null without a range. */
export function repRangeLabel(repMin?: number | null, repMax?: number | null): string | null {
  if (repMin == null && repMax == null) return null;
  if (repMin != null && repMax != null && repMin !== repMax) return `${repMin}–${repMax}`;
  return String(repMin ?? repMax);
}

/** The next mesocycle's default name: "Meso N+1". */
export function nextMesocycleName(existing: { name: string }[]): string {
  let highest = existing.length;
  for (const m of existing) {
    const match = /(\d+)\s*$/.exec(m.name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `Meso ${highest + 1}`;
}
