import { dayKey, daysBetween, isoWeekKey, shiftWeekKey } from './dates';
import { isHardSet } from './sets';
import type { MesocycleDetailInput, Muscle, MuscleOf, Session } from './types';

/** Whole calendar days since the last completed session with a hard set for `muscle`, or null if never. */
export function daysSinceTrained(sessions: Session[], muscle: Muscle, today: Date, muscleOf: MuscleOf): number | null {
  let latest: Date | null = null;
  for (const s of sessions) {
    if (!s.completedAt) continue;
    if (!s.sets.some((set) => isHardSet(set) && muscleOf(set.exerciseId) === muscle)) continue;
    const d = new Date(s.completedAt);
    if (!latest || d > latest) latest = d;
  }
  return latest ? Math.max(0, daysBetween(latest, today)) : null;
}

/**
 * Consecutive ISO weeks with at least one completed session, ending with the
 * current week. An empty current week doesn't break the streak; the count
 * ends at the previous week. Off-plan sessions count.
 */
export function weekStreak(sessions: Session[], today: Date): number {
  const weeks = new Set(sessions.filter((s) => s.completedAt).map((s) => isoWeekKey(new Date(s.completedAt))));
  let key = isoWeekKey(today);
  if (!weeks.has(key)) key = shiftWeekKey(key, -1);
  let streak = 0;
  while (weeks.has(key)) {
    streak += 1;
    key = shiftWeekKey(key, -1);
  }
  return streak;
}

const isDone = (d: { isComplete: boolean; completedAt: string | null }) => d.completedAt != null || d.isComplete;

/**
 * Planned days hit. Rest days are ignored.
 * - Completed weeks: every training day is due.
 * - The current week (the latest week with a completed training day): a day
 *   is due when its dayNumber is at or below the highest completed day, so
 *   skipped earlier days count as missed.
 * - Later weeks: nothing is due.
 */
export function adherence(meso: MesocycleDetailInput): { done: number; due: number; rate: number | null } {
  const weeks = [...meso.weeks].sort((a, b) => a.iterationNumber - b.iterationNumber);
  let currentIndex = -1;
  weeks.forEach((w, i) => {
    if (w.days.some((d) => !d.isRestDay && isDone(d))) currentIndex = i;
  });

  let done = 0;
  let due = 0;
  weeks.forEach((w, i) => {
    const training = w.days.filter((d) => !d.isRestDay);
    const weekComplete = w.status === 'COMPLETE' || i < currentIndex;
    if (weekComplete) {
      due += training.length;
      done += training.filter(isDone).length;
    } else if (i === currentIndex) {
      const highest = Math.max(...training.filter(isDone).map((d) => d.dayNumber));
      const dueDays = training.filter((d) => d.dayNumber <= highest);
      due += dueDays.length;
      done += dueDays.filter(isDone).length;
    }
  });
  return { done, due, rate: due > 0 ? done / due : null };
}

export const HEAT_LIGHT_MIN = 1;
export const HEAT_MEDIUM_MIN = 10;
export const HEAT_BIG_MIN = 18;

export type HeatLevel = 0 | 1 | 2 | 3;

export function heatLevel(hardSets: number): HeatLevel {
  if (hardSets >= HEAT_BIG_MIN) return 3;
  if (hardSets >= HEAT_MEDIUM_MIN) return 2;
  if (hardSets >= HEAT_LIGHT_MIN) return 1;
  return 0;
}

/** Heat level per day of `year`, keyed "YYYY-MM-DD", from that day's hard sets. Days without sessions are absent. */
export function dayHeatLevels(sessions: Session[], year?: number): Map<string, HeatLevel> {
  const sets = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completedAt) continue;
    const d = new Date(s.completedAt);
    if (year != null && d.getFullYear() !== year) continue;
    const key = dayKey(d);
    sets.set(key, (sets.get(key) ?? 0) + s.sets.filter(isHardSet).length);
  }
  const out = new Map<string, HeatLevel>();
  for (const [key, n] of sets) out.set(key, heatLevel(n));
  return out;
}

/** Mean completed sessions per week over the weeks from the first session in range to `today`. */
export function sessionsPerWeek(sessions: Session[], from: Date, today: Date): number | null {
  const inRange = sessions.filter((s) => {
    if (!s.completedAt) return false;
    const d = new Date(s.completedAt);
    return d >= from && d <= today;
  });
  if (inRange.length === 0) return null;
  const weeks = Math.max(1, daysBetween(from, today) / 7);
  return inRange.length / weeks;
}
