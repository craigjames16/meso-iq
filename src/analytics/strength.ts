import { weeksBetween } from './dates';
import { isE1rmEligible, isMainSet, volume } from './sets';
import type {
  ExerciseSession,
  MesocycleProgressInput,
  Muscle,
  SeriesPoint,
  Session,
  SetRecord,
} from './types';

/** Epley estimate of a one-rep max. Round for display only. */
export function e1rm(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/**
 * The e1RM-eligible set with the highest e1RM. Ties go to the heavier set,
 * then the earlier set number.
 */
export function topSet(sets: SetRecord[]): SetRecord | null {
  let best: SetRecord | null = null;
  let bestE = -Infinity;
  for (const s of sets) {
    if (!isE1rmEligible(s)) continue;
    const e = e1rm(s.weight, s.reps);
    if (
      best == null ||
      e > bestE ||
      (e === bestE && s.weight > best.weight) ||
      (e === bestE && s.weight === best.weight && s.setNumber < best.setNumber)
    ) {
      best = s;
      bestE = e;
    }
  }
  return best;
}

const time = (iso: string) => new Date(iso).getTime();

/**
 * One point per session with a top set, oldest first. A point is a PR when
 * its e1RM beats every earlier point. The first point is the baseline, never a PR.
 */
export function e1rmSeries(sessions: ExerciseSession[]): SeriesPoint[] {
  const points = sessions
    .map((s) => {
      const top = topSet(s.sets);
      if (!top) return null;
      return {
        workoutInstanceId: s.workoutInstanceId,
        date: s.completedAt,
        e1rm: e1rm(top.weight, top.reps),
        weight: top.weight,
        reps: top.reps,
        isPR: false,
      };
    })
    .filter((p): p is SeriesPoint => p != null)
    .sort((a, b) => time(a.date) - time(b.date));

  let best = -Infinity;
  points.forEach((p, i) => {
    p.isPR = i > 0 && p.e1rm > best;
    best = Math.max(best, p.e1rm);
  });
  return points;
}

export interface LiftRecords {
  heaviest: { weight: number; reps: number; date: string } | null;
  mostReps: { weight: number; reps: number; date: string } | null;
  bestSessionVolume: { volume: number; date: string } | null;
  bestE1rm: { e1rm: number; date: string } | null;
}

/** Records for one exercise. Heaviest and most reps use main sets; session volume uses all sets. */
export function liftRecords(sessions: ExerciseSession[]): LiftRecords {
  let heaviest: LiftRecords['heaviest'] = null;
  let mostReps: LiftRecords['mostReps'] = null;
  let bestSessionVolume: LiftRecords['bestSessionVolume'] = null;

  for (const session of sessions) {
    for (const s of session.sets) {
      if (!isMainSet(s) || s.reps <= 0) continue;
      if (
        heaviest == null ||
        s.weight > heaviest.weight ||
        (s.weight === heaviest.weight && s.reps > heaviest.reps)
      ) {
        heaviest = { weight: s.weight, reps: s.reps, date: session.completedAt };
      }
      if (
        mostReps == null ||
        s.reps > mostReps.reps ||
        (s.reps === mostReps.reps && s.weight > mostReps.weight)
      ) {
        mostReps = { weight: s.weight, reps: s.reps, date: session.completedAt };
      }
    }
    const v = volume(session.sets);
    if (v > 0 && (bestSessionVolume == null || v > bestSessionVolume.volume)) {
      bestSessionVolume = { volume: v, date: session.completedAt };
    }
  }

  let bestE1rm: LiftRecords['bestE1rm'] = null;
  for (const p of e1rmSeries(sessions)) {
    if (bestE1rm == null || p.e1rm > bestE1rm.e1rm) bestE1rm = { e1rm: p.e1rm, date: p.date };
  }

  return { heaviest, mostReps, bestSessionVolume, bestE1rm };
}

export interface SessionPR {
  exerciseId: number;
  kind: 'e1rm' | 'repsAtWeight';
  /** The new e1RM, or reps. */
  value: number;
  /** For repsAtWeight. */
  weight?: number;
  /** e1RM gain over the previous best. */
  delta?: number;
}

/**
 * Personal records set in `current`. `prior` holds each exercise's history
 * (as returned by GET /api/exercises/:id); sessions at or after `current`
 * are ignored. An exercise with no earlier session has no baseline, so it
 * can't set a record. Each exercise reports an e1RM record if it has one,
 * otherwise its heaviest reps-at-weight record.
 */
export function sessionPRs(current: Session, prior: ExerciseSession[][]): SessionPR[] {
  const currentTime = time(current.completedAt);
  const byExercise = new Map<number, SetRecord[]>();
  for (const s of current.sets) {
    const list = byExercise.get(s.exerciseId) ?? [];
    list.push(s);
    byExercise.set(s.exerciseId, list);
  }

  const priorSets = new Map<number, ExerciseSession[]>();
  for (const history of prior) {
    for (const session of history) {
      if (session.workoutInstanceId === current.workoutInstanceId) continue;
      if (time(session.completedAt) >= currentTime) continue;
      const id = session.sets[0]?.exerciseId;
      if (id == null) continue;
      const list = priorSets.get(id) ?? [];
      list.push(session);
      priorSets.set(id, list);
    }
  }

  const prs: SessionPR[] = [];
  for (const [exerciseId, sets] of byExercise) {
    const earlier = priorSets.get(exerciseId) ?? [];
    if (earlier.length === 0) continue;

    const top = topSet(sets);
    const priorBest = Math.max(-Infinity, ...earlier.map((s) => topSet(s.sets)).filter(Boolean).map((t) => e1rm(t!.weight, t!.reps)));
    if (top && Number.isFinite(priorBest)) {
      const value = e1rm(top.weight, top.reps);
      if (value > priorBest) {
        prs.push({ exerciseId, kind: 'e1rm', value, delta: value - priorBest });
        continue;
      }
    }

    const earlierMain = earlier.flatMap((s) => s.sets).filter((s) => isMainSet(s) && s.reps > 0);
    let bestRepsPR: SessionPR | null = null;
    for (const s of sets) {
      if (!isMainSet(s) || s.reps <= 0 || s.weight <= 0) continue;
      const comparable = earlierMain.filter((e) => e.weight >= s.weight);
      if (comparable.length === 0) continue;
      const maxReps = Math.max(...comparable.map((e) => e.reps));
      if (s.reps > maxReps && (bestRepsPR == null || s.weight > (bestRepsPR.weight ?? 0))) {
        bestRepsPR = { exerciseId, kind: 'repsAtWeight', value: s.reps, weight: s.weight };
      }
    }
    if (bestRepsPR) prs.push(bestRepsPR);
  }
  return prs;
}

export interface StallOptions {
  minSessions?: number;
  window?: number;
  threshold?: number;
}

/**
 * An exercise is stalled when it has at least `minSessions` points and the best
 * e1RM in the last `window` points is no more than `threshold` above the
 * best before them.
 */
export function isStalled(series: SeriesPoint[], opts: StallOptions = {}): boolean {
  const { minSessions = 4, window = 3, threshold = 0.005 } = opts;
  if (series.length < minSessions || series.length <= window) return false;
  const before = series.slice(0, series.length - window);
  const recent = series.slice(series.length - window);
  const bestBefore = Math.max(...before.map((p) => p.e1rm));
  const bestRecent = Math.max(...recent.map((p) => p.e1rm));
  return bestRecent <= bestBefore * (1 + threshold);
}

/** Least-squares fit. Returns null with fewer than two distinct x values. */
export function linearFit(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

function inWindow(series: SeriesPoint[], from: Date, to: Date): SeriesPoint[] {
  const a = from.getTime();
  const b = to.getTime();
  return series.filter((p) => {
    const t = time(p.date);
    return t >= a && t <= b;
  });
}

/**
 * Slope of e1RM against weeks elapsed, divided by the mean e1RM in the
 * window: a fraction per week. Null with fewer than 3 points.
 */
export function overloadRate(series: SeriesPoint[], from: Date, to: Date): number | null {
  const pts = inWindow(series, from, to);
  if (pts.length < 3) return null;
  const origin = new Date(pts[0].date);
  const fit = linearFit(pts.map((p) => ({ x: weeksBetween(origin, new Date(p.date)), y: p.e1rm })));
  if (!fit) return null;
  const mean = pts.reduce((s, p) => s + p.e1rm, 0) / pts.length;
  return mean > 0 ? fit.slope / mean : null;
}

/** Average of exercise overload rates for one muscle, weighted by each exercise's points in the window. */
export function muscleOverloadRate(byExercise: { series: SeriesPoint[] }[], from: Date, to: Date): number | null {
  let weighted = 0;
  let weight = 0;
  for (const ex of byExercise) {
    const rate = overloadRate(ex.series, from, to);
    if (rate == null) continue;
    const n = inWindow(ex.series, from, to).length;
    weighted += rate * n;
    weight += n;
  }
  return weight > 0 ? weighted / weight : null;
}

/** The muscle with the highest positive overload rate, or null when none is positive. */
export function fastestRiser(byMuscle: Partial<Record<Muscle, number | null>>): { muscle: Muscle; rate: number } | null {
  let best: { muscle: Muscle; rate: number } | null = null;
  for (const [muscle, rate] of Object.entries(byMuscle) as [Muscle, number | null][]) {
    if (rate == null || rate <= 0) continue;
    if (best == null || rate > best.rate) best = { muscle, rate };
  }
  return best;
}

/**
 * For each exercise, the change in top-set e1RM from its first logged week
 * to its latest logged week, as a fraction. Exercises logged in only one
 * week are skipped. `average` is the unweighted mean of those changes.
 */
export function cycleE1rmDelta(progress: MesocycleProgressInput): {
  average: number | null;
  byExercise: { exerciseId: number; delta: number; first: number; latest: number }[];
} {
  const byExerciseWeek = new Map<number, Map<number, SetRecord[]>>();
  for (const session of progress.sessions) {
    for (const s of session.sets) {
      const weeks = byExerciseWeek.get(s.exerciseId) ?? new Map<number, SetRecord[]>();
      const list = weeks.get(session.iteration) ?? [];
      list.push(s);
      weeks.set(session.iteration, list);
      byExerciseWeek.set(s.exerciseId, weeks);
    }
  }

  const byExercise: { exerciseId: number; delta: number; first: number; latest: number }[] = [];
  for (const [exerciseId, weeks] of byExerciseWeek) {
    const logged = [...weeks.entries()]
      .map(([week, sets]) => ({ week, top: topSet(sets) }))
      .filter((w) => w.top != null)
      .sort((a, b) => a.week - b.week);
    if (logged.length < 2) continue;
    const first = e1rm(logged[0].top!.weight, logged[0].top!.reps);
    const last = logged[logged.length - 1].top!;
    const latest = e1rm(last.weight, last.reps);
    if (first <= 0) continue;
    byExercise.push({ exerciseId, delta: (latest - first) / first, first, latest });
  }

  const average =
    byExercise.length > 0 ? byExercise.reduce((s, e) => s + e.delta, 0) / byExercise.length : null;
  return { average, byExercise };
}
