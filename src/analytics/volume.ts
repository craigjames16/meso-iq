import { addDays, startOfDay } from './dates';
import { isHardSet, volume } from './sets';
import { ALL_MUSCLES } from './types';
import type { MesocycleProgressInput, Muscle, MuscleOf, Session, SetRecord } from './types';

export function emptyMuscleRecord(): Record<Muscle, number> {
  return ALL_MUSCLES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<Muscle, number>);
}

function completed(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.completedAt != null);
}

/** Days in a rolling window. */
export const ROLLING_DAYS = 7;

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * A rolling window of `ROLLING_DAYS` whole days, inclusive at both ends.
 * `weeksBack` 0 is the window ending today, 1 the window before it. Windows
 * are contiguous and never overlap, so a count and its predecessor cover the
 * same span of days whatever weekday it is.
 */
export function rollingWindow(today: Date, weeksBack = 0): DateRange {
  const to = addDays(startOfDay(today), -ROLLING_DAYS * weeksBack);
  return { from: addDays(to, -(ROLLING_DAYS - 1)), to };
}

/** Completed sessions whose day falls inside `range`. */
export function sessionsInRange(sessions: Session[], range: DateRange): Session[] {
  const from = range.from.getTime();
  const to = range.to.getTime();
  return completed(sessions).filter((s) => {
    const day = startOfDay(new Date(s.completedAt)).getTime();
    return day >= from && day <= to;
  });
}

/** Hard sets per muscle inside `range`. Unknown exercises are skipped. */
export function hardSetsInRange(sessions: Session[], range: DateRange, muscleOf: MuscleOf): Record<Muscle, number> {
  const out = emptyMuscleRecord();
  for (const session of sessionsInRange(sessions, range)) {
    for (const s of session.sets) {
      if (!isHardSet(s)) continue;
      const muscle = muscleOf(s.exerciseId);
      if (muscle) out[muscle] += 1;
    }
  }
  return out;
}

/** Rolling windows behind the current one that set the baseline. */
export const BASELINE_WINDOWS = 4;

/**
 * Hard sets per muscle in the last seven days, with the mean of the four
 * windows behind it as the baseline. The current window and each baseline
 * window cover the same number of days, so the pair reads the same on any
 * weekday instead of resetting on Monday. A window with no sessions counts as
 * zero, which pulls the baseline down when history is shorter than 35 days.
 */
export function rollingHardSets(
  sessions: Session[],
  today: Date,
  muscleOf: MuscleOf,
): { current: Record<Muscle, number>; baseline: Record<Muscle, number>; window: DateRange } {
  const window = rollingWindow(today);
  const baseline = emptyMuscleRecord();
  for (let i = 1; i <= BASELINE_WINDOWS; i++) {
    const rec = hardSetsInRange(sessions, rollingWindow(today, i), muscleOf);
    for (const m of ALL_MUSCLES) baseline[m] += rec[m];
  }
  for (const m of ALL_MUSCLES) baseline[m] /= BASELINE_WINDOWS;
  return { current: hardSetsInRange(sessions, window, muscleOf), baseline, window };
}

function hardSetsInIteration(progress: MesocycleProgressInput, iteration: number, muscleOf: MuscleOf): Record<Muscle, number> {
  const out = emptyMuscleRecord();
  for (const session of progress.sessions) {
    if (session.iteration !== iteration) continue;
    for (const s of session.sets) {
      if (!isHardSet(s)) continue;
      const m = muscleOf(s.exerciseId);
      if (m) out[m] += 1;
    }
  }
  return out;
}

/**
 * Hard sets per muscle in week `iteration` of each cycle, so the comparison
 * is week N against week N. A shorter previous cycle uses its last week.
 * Both series are normalised to the largest value across both, and the six
 * muscles with the most sets across both cycles are kept.
 */
export function cycleRadar(
  current: MesocycleProgressInput,
  previous: MesocycleProgressInput | null,
  iteration: number,
  muscleOf: MuscleOf,
): { axes: Muscle[]; current: number[]; previous: number[] | null; raw: { current: number[]; previous: number[] | null } } {
  const cur = hardSetsInIteration(current, iteration, muscleOf);
  let prev: Record<Muscle, number> | null = null;
  if (previous && previous.sessions.length > 0) {
    const lastWeek = Math.max(...previous.sessions.map((s) => s.iteration));
    prev = hardSetsInIteration(previous, Math.min(iteration, lastWeek), muscleOf);
  }

  const totals = ALL_MUSCLES.map((m) => ({ m, total: cur[m] + (prev ? prev[m] : 0) }));
  const top = new Set(
    [...totals]
      .filter((t) => t.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((t) => t.m),
  );
  const axes = ALL_MUSCLES.filter((m) => top.has(m));
  const max = Math.max(1, ...axes.map((m) => cur[m]), ...axes.map((m) => (prev ? prev[m] : 0)));
  return {
    axes,
    current: axes.map((m) => cur[m] / max),
    previous: prev ? axes.map((m) => prev![m] / max) : null,
    raw: { current: axes.map((m) => cur[m]), previous: prev ? axes.map((m) => prev![m]) : null },
  };
}

/** Matches defaultTwoSets() in workoutTrackingResolver. */
export const DEFAULT_STARTING_SETS = 2;
/** Profile bars below this turn gold. */
export const LOW_VOLUME_SETS = 4;
/** Used in the low-volume warning copy. */
export const GROWTH_TARGET_SETS = 8;

/** Starting sets per muscle across all training days. Missing startingSets count as 2. */
export function programVolumeProfile(days: { exercises: { muscle: Muscle | undefined; startingSets?: number | null }[] }[]): Record<Muscle, number> {
  const out = emptyMuscleRecord();
  for (const day of days) {
    for (const ex of day.exercises) {
      if (!ex.muscle) continue;
      out[ex.muscle] += ex.startingSets ?? DEFAULT_STARTING_SETS;
    }
  }
  return out;
}

/** Trained muscles under LOW_VOLUME_SETS, lowest first. */
export function lowVolumeMuscles(profile: Record<Muscle, number>): Muscle[] {
  return ALL_MUSCLES.filter((m) => profile[m] > 0 && profile[m] < LOW_VOLUME_SETS).sort(
    (a, b) => profile[a] - profile[b],
  );
}

export const REP_BUCKETS = ['1–5', '6–8', '9–12', '13–15', '16+'] as const;
export type RepBucket = (typeof REP_BUCKETS)[number];

export function repBucket(reps: number): RepBucket {
  if (reps <= 5) return '1–5';
  if (reps <= 8) return '6–8';
  if (reps <= 12) return '9–12';
  if (reps <= 15) return '13–15';
  return '16+';
}

/** Share of hard sets in each rep bucket. Fractions sum to 1, or are all 0 with no sets. */
export function repRangeShare(sets: SetRecord[]): Record<RepBucket, number> {
  const out = REP_BUCKETS.reduce((acc, b) => ({ ...acc, [b]: 0 }), {} as Record<RepBucket, number>);
  const hard = sets.filter(isHardSet);
  if (hard.length === 0) return out;
  for (const s of hard) out[repBucket(s.reps)] += 1;
  for (const b of REP_BUCKETS) out[b] /= hard.length;
  return out;
}

export const MATRIX_REP_COLS = ['≤4', '5–6', '7–8', '9–10', '11–12', '13+'] as const;

function matrixCol(reps: number): number {
  if (reps <= 4) return 0;
  if (reps <= 6) return 1;
  if (reps <= 8) return 2;
  if (reps <= 10) return 3;
  if (reps <= 12) return 4;
  return 5;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export type MatrixLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Weight rows × rep-bucket columns for one exercise's hard sets. Rows are
 * distinct weights, heaviest first. With more than `maxRows` weights, the
 * most frequent are kept. Non-zero counts map to levels 1–4 by quartile;
 * the most frequent cell is always level 4.
 */
export function weightRepMatrix(
  sets: SetRecord[],
  maxRows = 6,
): { rows: number[]; counts: number[][]; levels: MatrixLevel[][] } {
  const hard = sets.filter((s) => isHardSet(s) && s.weight > 0);
  const freq = new Map<number, number>();
  for (const s of hard) freq.set(s.weight, (freq.get(s.weight) ?? 0) + 1);
  let rows = [...freq.keys()];
  if (rows.length > maxRows) {
    rows = rows
      .sort((a, b) => freq.get(b)! - freq.get(a)! || b - a)
      .slice(0, maxRows);
  }
  rows.sort((a, b) => b - a);

  const counts = rows.map(() => MATRIX_REP_COLS.map(() => 0));
  const index = new Map(rows.map((w, i) => [w, i]));
  for (const s of hard) {
    const r = index.get(s.weight);
    if (r == null) continue;
    counts[r][matrixCol(s.reps)] += 1;
  }

  const nonZero = counts.flat().filter((c) => c > 0).sort((a, b) => a - b);
  const max = nonZero.length ? nonZero[nonZero.length - 1] : 0;
  const q1 = quantile(nonZero, 0.25);
  const q2 = quantile(nonZero, 0.5);
  const q3 = quantile(nonZero, 0.75);
  const levels = counts.map((row) =>
    row.map((c): MatrixLevel => {
      if (c === 0) return 0;
      if (c === max || c > q3) return 4;
      if (c > q2) return 3;
      if (c > q1) return 2;
      return 1;
    }),
  );
  return { rows, counts, levels };
}

/**
 * The caption under the matrix, built from the data: the most reps ever
 * done at the heaviest weight. Null when there are no hard sets with weight.
 */
export function matrixCaption(sets: SetRecord[], unit = 'lb'): string | null {
  const hard = sets.filter((s) => isHardSet(s) && s.weight > 0);
  if (hard.length === 0) return null;
  const heaviest = Math.max(...hard.map((s) => s.weight));
  const maxReps = Math.max(...hard.filter((s) => s.weight === heaviest).map((s) => s.reps));
  const w = Number.isInteger(heaviest) ? String(heaviest) : heaviest.toFixed(1);
  return `You have never lifted ${w} ${unit} for more than ${maxReps} ${maxReps === 1 ? 'rep' : 'reps'}.`;
}

export interface MonthTonnage {
  month: number;
  tonnage: number;
  partial: boolean;
  avg3: number | null;
}

/**
 * Tonnage per calendar month of `year`. `avg3` is the mean of a month and
 * the two before it, null until the third month with data. The current month
 * is partial. For the current year, months after today are omitted.
 */
export function tonnageByMonth(sessions: Session[], year: number, today: Date = new Date()): MonthTonnage[] {
  const totals = new Array(12).fill(0);
  for (const s of completed(sessions)) {
    const d = new Date(s.completedAt);
    if (d.getFullYear() !== year) continue;
    totals[d.getMonth()] += volume(s.sets);
  }
  const lastMonth = year === today.getFullYear() ? today.getMonth() : year > today.getFullYear() ? -1 : 11;
  const firstWithData = totals.findIndex((t) => t > 0);
  const out: MonthTonnage[] = [];
  for (let m = 0; m <= lastMonth; m++) {
    const avg3 =
      firstWithData >= 0 && m >= firstWithData + 2 ? (totals[m] + totals[m - 1] + totals[m - 2]) / 3 : null;
    out.push({
      month: m,
      tonnage: totals[m],
      partial: year === today.getFullYear() && m === today.getMonth(),
      avg3,
    });
  }
  return out;
}

export function sessionTotals(session: Session): { hardSets: number; tonnage: number } {
  return { hardSets: session.sets.filter(isHardSet).length, tonnage: volume(session.sets) };
}

/** The latest completed session of the same workout before this one. */
export function previousSameWorkout(session: Session, sessions: Session[]): Session | null {
  const t = new Date(session.completedAt).getTime();
  let best: Session | null = null;
  for (const s of completed(sessions)) {
    if (s.workoutInstanceId === session.workoutInstanceId || s.workoutId !== session.workoutId) continue;
    const st = new Date(s.completedAt).getTime();
    if (st >= t) continue;
    if (!best || st > new Date(best.completedAt).getTime()) best = s;
  }
  return best;
}

/** Fractional tonnage change against the previous session of the same workout, or null. */
export function tonnageDeltaVsLast(session: Session, sessions: Session[]): number | null {
  const prev = previousSameWorkout(session, sessions);
  if (!prev) return null;
  const before = volume(prev.sets);
  if (before <= 0) return null;
  return (volume(session.sets) - before) / before;
}

export function allTimeTotals(sessions: Session[]): { tonnage: number; sets: number; sessions: number; exercises: number } {
  const done = completed(sessions);
  const exercises = new Set<number>();
  let tonnage = 0;
  let sets = 0;
  for (const s of done) {
    tonnage += volume(s.sets);
    for (const set of s.sets) {
      if (isHardSet(set)) sets += 1;
      exercises.add(set.exerciseId);
    }
  }
  return { tonnage, sets, sessions: done.length, exercises: exercises.size };
}

/** Hard sets per muscle in a list of sessions, for "the exercises behind a bar". */
export function hardSetsByExercise(sessions: Session[], muscle: Muscle, muscleOf: MuscleOf): Map<number, number> {
  const out = new Map<number, number>();
  for (const session of completed(sessions)) {
    for (const s of session.sets) {
      if (!isHardSet(s) || muscleOf(s.exerciseId) !== muscle) continue;
      out.set(s.exerciseId, (out.get(s.exerciseId) ?? 0) + 1);
    }
  }
  return out;
}
