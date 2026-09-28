# Analytics

This document defines every derived number the redesign shows. Each metric has a definition, a function signature, its data source and the tests it needs. Phase 4 builds this layer. The screens in [`03-screens.md`](03-screens.md) reference these functions by name.

All functions live in `src/analytics/` as pure TypeScript with no React or network imports. Tests live in `src/analytics/__tests__/`.

## Data sources

Every metric comes from endpoints the client already calls.

- **Training history**: `GET /api/workout-instances/history` through `workoutService.getHistory()` and `ScheduleContext.fetchHistory()`. It returns completed workout instances with `exerciseSets`, covering about one year. It feeds consistency, streak, tonnage, weekly hard sets, days since trained and rep ranges.
- **Single exercise**: `GET /api/exercises/:id` through `exercisesService.getExercise(id)`. It returns every session for that exercise with its sets. It feeds the e1RM series, PRs, records, matrix and stall checks for one exercise.
- **Exercise list**: `GET /api/exercises` through `exercisesService.getExercises()`. It returns exercises grouped by category. Use it to map `exerciseId` to its muscle category, because history sets don't carry the category.
- **Mesocycle detail**: `GET /api/mesocycles/:id` through `mesocyclesService.getMesocycle(id)`. It returns plan instances (weeks) with `iterationNumber`, `rir` and days with `isComplete`. It feeds adherence and the week-by-week list.
- **Mesocycle progress**: `GET /api/dashboard?data=mesocycle&id=:id` through `dashboardService.getMesocycleProgress(id)`. It returns plan days × iterations × exercises with sets. It feeds cycle e1RM deltas and the cycle radar.
- **Muscle group sets**: `GET /api/dashboard?data=muscleGroupSets[&mesocycleId]` through `dashboardService.getMuscleGroupSets()`. Use it only as a cross-check. Compute weekly hard sets from history so the main-set rule applies.

**Note:** the `WorkoutInstance.exerciseSets` type in `src/types/workout.ts` omits `subSetNumber` and `setType`, but the tracking resolver reads both. Phase 0 confirms whether the history endpoint returns them. If it does, add them to the type. If it doesn't, treat every set as a main set until the API adds them, and file that in [`04-backend.md`](04-backend.md#set-fields-in-history).

## Shared types

```ts
// src/analytics/types.ts
export type SetType = 'REGULAR' | 'DROP_SET' | 'REST_PAUSE' | 'MYO_REP';
export type Muscle = 'BACK' | 'BICEPS' | 'CALVES' | 'CHEST' | 'HAMSTRINGS' | 'QUADS' | 'SHOULDERS' | 'TRICEPS';

export interface SetRecord {
  exerciseId: number;
  weight: number;
  reps: number;
  setNumber: number;
  subSetNumber?: number | null;
  setType?: SetType;
}

export interface Session {            // one completed workout instance
  workoutInstanceId: number;
  workoutId: number;                  // the workout template; same for every "Push" session
  workoutName: string;
  completedAt: string;                // ISO date
  sets: SetRecord[];
  planned: boolean;                   // false for off-plan sessions
}

export interface ExerciseSession {    // one exercise within one session
  workoutInstanceId: number;
  completedAt: string;
  sets: SetRecord[];
}

export interface SeriesPoint {
  workoutInstanceId: number;
  date: string;
  e1rm: number;
  weight: number;                     // the top set
  reps: number;
  isPR: boolean;
}
```

Write adapters in `src/analytics/adapters.ts` that turn service responses into these types. No other file in `src/analytics` imports from `src/types` or `src/services`.

## Set rules

These rules apply to every metric.

- **Main set**: `subSetNumber` is `null` or `undefined`. Drop, rest-pause and myo-rep children are attached sets.
- **Hard set**: a main set with `reps > 0` in a completed session. Set counts and hard sets count hard sets only.
- **Volume and tonnage**: `weight × reps`, summed over all sets, including attached sets.
- **e1RM-eligible set**: a main set with `weight > 0` and `1 ≤ reps ≤ 15`. Sets above 15 reps make the Epley estimate unreliable.
- **Completed session**: `completedAt` isn't null. Ignore in-progress sessions everywhere except the logger.

```ts
export const isMainSet = (s: SetRecord) => s.subSetNumber == null;
export const isHardSet = (s: SetRecord) => isMainSet(s) && s.reps > 0;
export const isE1rmEligible = (s: SetRecord) => isMainSet(s) && s.weight > 0 && s.reps >= 1 && s.reps <= 15;
```

## Strength

### e1RM

The Epley formula estimates a one-rep max.

```ts
export function e1rm(weight: number, reps: number): number; // reps === 1 ? weight : weight * (1 + reps / 30)
```

Round for display only, to the nearest whole unit.

### Top set

```ts
export function topSet(sets: SetRecord[]): SetRecord | null;
```

Returns the e1RM-eligible set with the highest e1RM. On a tie, return the heavier set, then the earlier `setNumber`. Returns `null` when no set is eligible. The Exercise detail session list highlights this set.

### e1RM series and PRs

```ts
export function e1rmSeries(sessions: ExerciseSession[]): SeriesPoint[];
```

Returns one point per session with a top set, sorted by date ascending. A point is a PR when its e1RM is strictly greater than every earlier point's. The first point is never a PR, because it's the baseline.

### Records

```ts
export interface LiftRecords {
  heaviest: { weight: number; reps: number; date: string } | null;   // max weight, ties -> more reps
  mostReps: { weight: number; reps: number; date: string } | null;   // max reps, ties -> heavier
  bestSessionVolume: { volume: number; date: string } | null;
  bestE1rm: { e1rm: number; date: string } | null;
}
export function liftRecords(sessions: ExerciseSession[]): LiftRecords;
```

`heaviest` and `mostReps` use main sets. `bestSessionVolume` uses all sets.

### Session PRs

```ts
export interface SessionPR {
  exerciseId: number;
  kind: 'e1rm' | 'repsAtWeight';
  value: number;          // new e1RM, or reps
  weight?: number;        // for repsAtWeight
  delta?: number;         // e1RM gain over the previous best
}
export function sessionPRs(current: Session, prior: ExerciseSession[][]): SessionPR[];
```

Workout complete shows these. `repsAtWeight` fires when a main set has more reps than any earlier main set at the same weight or heavier.

### Stall detection

```ts
export function isStalled(series: SeriesPoint[], opts?: { minSessions?: 4; window?: 3; threshold?: 0.005 }): boolean;
```

An exercise is stalled when it has at least `minSessions` points and the best e1RM in the last `window` points is no more than `threshold` (0.5%) above the best e1RM before them.

### Overload rate

```ts
export function overloadRate(series: SeriesPoint[], from: Date, to: Date): number | null;
export function muscleOverloadRate(byExercise: { series: SeriesPoint[] }[], from: Date, to: Date): number | null;
```

`overloadRate` fits a least-squares line of e1RM against weeks elapsed, using the points in the window. It returns the slope divided by the mean e1RM in the window, as a fraction per week. It returns `null` with fewer than 3 points.

`muscleOverloadRate` averages the exercise rates for one muscle, weighted by each exercise's point count in the window. It returns `null` when no exercise qualifies.

The Progress screen labels this "Est. 1RM change per week · last 6 months". The window always matches the screen's time filter.

### Fastest riser

```ts
export function fastestRiser(byMuscle: Record<Muscle, number | null>): { muscle: Muscle; rate: number } | null;
```

Returns the muscle with the highest positive overload rate for the cycle, or `null` when none is positive.

### Cycle e1RM delta

```ts
export function cycleE1rmDelta(progress: MesocycleProgressInput): { average: number; byExercise: { exerciseId: number; delta: number }[] };
```

For each exercise, compare the top-set e1RM in its first logged iteration with its latest logged iteration. Skip exercises with only one logged iteration. `average` is the unweighted mean of the per-exercise fractional changes. The UI labels it "avg e1RM", on mesocycle rows, the Programs cycle card and Mesocycle detail.

## Volume

### Rolling hard sets per muscle

```ts
export function rollingWindow(today: Date, weeksBack?: number): { from: Date; to: Date };
export function sessionsInRange(sessions: Session[], range: { from: Date; to: Date }): Session[];
export function hardSetsInRange(sessions: Session[], range: { from: Date; to: Date }, muscleOf: (exerciseId: number) => Muscle | undefined): Record<Muscle, number>;
export function rollingHardSets(sessions: Session[], today: Date, muscleOf: (exerciseId: number) => Muscle | undefined): { current: Record<Muscle, number>; baseline: Record<Muscle, number>; window: { from: Date; to: Date } };
```

A *rolling window* is seven whole days in the device time zone, inclusive at both ends. `weeksBack` 0 is the window ending today, 1 is the window before it, and so on, so the windows are contiguous and never overlap. `rollingHardSets` returns the current window's count per muscle, plus `baseline`: the mean of the four windows behind it, which is 28 days of history ending the day before the current window opens. A window with no sessions counts as zero, so a baseline built on less than 35 days of history reads low. The Cycle screen shows the current count as a bar with the baseline as a tick.

The current window and each baseline window cover the same number of days on any weekday, which frees you from reading a partial week against complete ones. The cost is that the window smooths the step into a deload: it still holds days from the hard week for up to six days after the deload starts.

### Cycle radar

```ts
export function cycleRadar(current: MesocycleProgressInput, previous: MesocycleProgressInput | null, iteration: number, muscleOf: (id: number) => Muscle | undefined): { axes: Muscle[]; current: number[]; previous: number[] | null };
```

Counts hard sets per muscle in iteration `iteration` of each cycle, so the comparison is week N against week N. If the previous cycle is shorter, use its last iteration. Normalise both series to the largest value across both. Show the six muscles with the most sets across both cycles.

### Program volume profile

```ts
export const DEFAULT_STARTING_SETS = 2;   // matches defaultTwoSets() in workoutTrackingResolver
export const LOW_VOLUME_SETS = 4;         // bars below this turn gold
export const GROWTH_TARGET_SETS = 8;      // used in the warning copy
export function programVolumeProfile(days: { exercises: { muscle: Muscle; startingSets?: number }[] }[]): Record<Muscle, number>;
export function lowVolumeMuscles(profile: Record<Muscle, number>): Muscle[];
```

Sums `startingSets` (default 2) per muscle across all training days. The builder and program detail label this "Starting sets per muscle · week 1". The builder shows one warning line for the lowest muscle under `LOW_VOLUME_SETS`: "Shoulders get 2 sets a week. Most muscles need 8 or more to grow."

### Rep-range distribution

```ts
export const REP_BUCKETS = ['1–5', '6–8', '9–12', '13–15', '16+'] as const;
export function repRangeShare(sets: SetRecord[]): Record<(typeof REP_BUCKETS)[number], number>; // fractions summing to 1
```

Uses hard sets from all exercises in the time window.

### Weight × rep matrix

```ts
export const MATRIX_REP_COLS = ['≤4', '5–6', '7–8', '9–10', '11–12', '13+'] as const;
export function weightRepMatrix(sets: SetRecord[], maxRows = 6): { rows: number[]; counts: number[][]; levels: (0 | 1 | 2 | 3 | 4)[][] };
```

Covers one exercise, the one selected on the Progress screen. Rows are the distinct weights of its hard sets, heaviest first. When there are more than `maxRows`, keep the `maxRows` most frequent weights and sort them heaviest first. `counts` holds sets per cell. `levels` maps non-zero counts to 1–4 by quartile of the non-zero counts. Empty cells are level 0.

The caption under the matrix names the heaviest row's best rep bucket: "You have never pressed 205 for more than 6 reps." Generate it from the data, not a template with fixed values.

### Tonnage by month

```ts
export function tonnageByMonth(sessions: Session[], year: number): { month: number; tonnage: number; partial: boolean; avg3: number | null }[];
```

Sums volume per calendar month. `avg3` is the mean of that month and the two before it, or `null` for the first two months with data. The current month is `partial`.

### Session totals and deltas

```ts
export function sessionTotals(session: Session): { hardSets: number; tonnage: number };
export function previousSameWorkout(session: Session, sessions: Session[]): Session | null;
export function tonnageDeltaVsLast(session: Session, sessions: Session[]): number | null;
```

`previousSameWorkout` returns the latest completed session with the same `workoutId` before this one. `tonnageDeltaVsLast` is the fractional change in tonnage against it, or `null` when there's none. Today, History, Past session and Workout complete show this as "+3.1% vs last".

### All-time totals

```ts
export function allTimeTotals(sessions: Session[]): { tonnage: number; sets: number; sessions: number; exercises: number };
```

`sets` counts hard sets. `exercises` counts distinct exercise IDs.

## Consistency

### Days since trained

```ts
export function daysSinceTrained(sessions: Session[], muscle: Muscle, today: Date, muscleOf: (id: number) => Muscle | undefined): number | null;
```

Returns whole calendar days since the last completed session with a hard set for that muscle, or `null` if never. The Today screen shows this for each muscle the day's workout trains.

### Streak

```ts
export function weekStreak(sessions: Session[], today: Date): number;
```

Counts consecutive ISO weeks with at least one completed session, ending with the current week. If the current week has no session yet, the count ends at the previous week without breaking. Off-plan sessions count.

### Adherence

```ts
export function adherence(meso: MesocycleDetailInput): { done: number; due: number; rate: number | null };
```

Counts non-rest days only, and planned sessions only.

- **Completed weeks**: every non-rest day is due.
- **Current week**: a day is due when its `dayNumber` is at or below the highest completed `dayNumber` in that week. Days skipped before the latest completed day count as missed.
- **Future weeks**: no days are due.

`rate` is `done / due`, or `null` when nothing is due. The UI shows it as "87% adherence" or "Planned days hit".

### Heat levels

```ts
export function dayHeatLevels(sessions: Session[], year: number): Map<string, 0 | 1 | 2 | 3>;
```

Keys are `YYYY-MM-DD`. The level comes from that day's hard sets: 0 for none, 1 for 1–9, 2 for 10–17, and 3 for 18 or more. Put the thresholds in named constants.

## Hooks

Build these in `src/hooks/`. Each returns `{ data, loading, error, refresh }` and memoises derivations on its inputs.

- **`useTrainingHistory()`**: sessions from `ScheduleContext.fetchHistory()`, adapted to `Session[]`, plus `muscleOf` built from the exercise list.
- **`useExerciseProgress(exerciseId, range)`**: `e1rmSeries`, `liftRecords`, `weightRepMatrix`, `isStalled` and the linear trend for one exercise.
- **`useCycleStats(mesocycleId)`**: adherence, week-by-week tonnage and RIR, `cycleE1rmDelta`, per-exercise series for the strength trend list, stalls, fastest riser and `cycleRadar` against the previous mesocycle.
- **`useProgress(range)`**: rep-range share and per-muscle overload rates across all exercises. It fetches `getExercise` for each exercise performed in the range, with at most 4 requests in flight, and caches results for the session. Replace this with the aggregate endpoint in [`04-backend.md`](04-backend.md#optional-aggregate-endpoints) when it ships.
- **`useConsistency(year)`**: heat levels, streak, sessions per week and adherence across mesocycles in the year.

## Required tests

Each function gets a test file. Cover at least these cases:

- **`e1rm`**: 1 rep returns the weight; `e1rm(100, 10)` returns 133.33.
- **`topSet`**: ignores attached sets and sets over 15 reps; the tie-break order; returns `null` for no eligible sets.
- **`e1rmSeries`**: first point isn't a PR; an equal value isn't a PR; a strictly higher value is; sorts unsorted input.
- **`liftRecords`**: tie-breaks; `bestSessionVolume` includes drop sets.
- **`isStalled`**: false under 4 points; true for flat; false for a 0.6% gain; true for a 0.4% gain.
- **`overloadRate`**: `null` under 3 points; positive slope for rising data; ignores points outside the window.
- **`rollingWindow`**: covers seven whole days ending today; the preceding window sits immediately before it without overlap.
- **`sessionsInRange`**: includes both end days whatever time of day the session finished.
- **`hardSetsInRange`**: attached sets don't count; unknown exercises are skipped.
- **`rollingHardSets`**: averages the four windows behind the current one; the baseline ends where the current window opens and starts 35 days back; an empty window counts as zero.
- **`adherence`**: skipped earlier days count as missed; future weeks aren't due; rest days are ignored.
- **`weekStreak`**: an empty current week doesn't break the streak; a gap week does.
- **`repRangeShare`**: bucket boundaries at 5, 8, 12, 15 and 16; the shares sum to 1.
- **`weightRepMatrix`**: row selection with more than 6 weights; quartile levels; empty input.
- **`tonnageByMonth`**: `avg3` is `null` for the first two months; the current month is partial.
- **`cycleE1rmDelta`**: skips single-iteration exercises; averages without weighting.

## Implementation notes

These record where the Phase 4 build refines the definitions above.

- **Cycle data source**: `GET /api/dashboard?data=mesocycle` returns sets without `subSetNumber` or `setType`. `MesocycleProgressInput` is built from training history instead (`cycleProgressFromSessions`), where each session carries its mesocycle and week through `planInstanceDays`. History covers about one year, which spans any running or recent cycle.
- **`cycleE1rmDelta`**: `average` is `null` when no exercise was logged in two weeks, so the UI can show "Not enough sessions yet" rather than 0%.
- **`sessionPRs`**: `prior` is a list of per-exercise histories from `GET /api/exercises/:id`. An exercise with no earlier session sets no record. Each exercise reports its e1RM record if it has one, otherwise its heaviest reps-at-weight record, which needs at least one earlier main set at that weight or heavier.
- **`weightRepMatrix`**: quartiles use linear interpolation over the sorted non-zero counts. The most frequent cell is always level 4, so a matrix where every cell has the same count still reads as bright.
- **`matrixCaption`**: reports the most reps ever done at the heaviest weight: "You have never lifted 205 lb for more than 6 reps."
- **`lowVolumeMuscles`**: only muscles the program trains (more than 0 starting sets) can trigger the warning.
- **`tonnageByMonth`**: takes an optional `today` for testing. For the current year it returns months up to today's month.
- **Adherence in History**: `useConsistency` sums `adherence` over every mesocycle with a session in the selected year.
