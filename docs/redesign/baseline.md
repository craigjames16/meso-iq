# Redesign baseline

This page records the state of `main` at `f31609d` before the redesign began, so later phases can tell new failures from existing ones. It also records the API response shapes that the analytics layer depends on.

## Check results

Recorded on 2026-09-21 on branch `redesign/base`.

- **`npx tsc --noEmit`**: passes with no errors.
- **`npm run lint`**: 77 problems, 48 errors and 29 warnings. They're spread over 31 files. The largest counts are in `WorkoutDetailScreen.tsx` (8), `MainNavigator.tsx` (8), `TrackScreen.tsx` (6) and `ExerciseTrackingCard.tsx` (5). Most are unused variables, missing hook dependencies and inline styles.
- **`npm test`**: the only suite, `__tests__/App.test.tsx`, fails before it renders. `@react-native-async-storage/async-storage` has no Jest mock, so importing `App` throws `NativeModule: AsyncStorage is null`.

A phase passes the checks when `tsc` stays clean, lint reports no more than 48 errors, and every suite except `App.test.tsx` passes.

**Note:** the work in progress that Phase 0 mentions (`WorkoutCompleteScreen.tsx`, `workoutTrackingResolver.ts`, `workoutVolume.ts`, `userDataExportService.ts`) was already committed in `f31609d`, so no stash was needed.

## Test harness

Jest's `react-native` preset runs plain TypeScript tests under `src/**/__tests__` through Babel. `src/analytics/__tests__/smoke.test.ts` confirms it.

## API response shapes

The API lives in the `simple-workout-tracker` repo (Next.js and Prisma). These shapes come from its route handlers and `prisma/schema.prisma`, not from a live account.

### Training history

`workoutService.getHistory()` calls `GET /api/workout-instances?completed=true&since=YYYY-MM-DD`. The deprecated `GET /api/workout-instances/history` route redirects to the same query.

The handler returns Prisma rows with these includes:

```
WorkoutInstance {
  id, workoutId, userId, mesocycleId, startedAt, completedAt, createdAt, updatedAt,
  workout: Workout { id, name, ... },
  exerciseSets: ExerciseSet {
    id, exerciseId, workoutInstanceId, setNumber, subSetNumber, setType, weight, reps,
    exercise: Exercise { id, name, category, userId, ... }
  }[],
  planInstanceDays: PlanInstanceDay { ..., planInstance: PlanInstance { ..., rir, plan, mesocycle } }[],
  workoutExercises: WorkoutExercise { ..., exercise, workout }[]
}
```

- **`subSetNumber`**: included on every set, because the include returns all scalar columns. `null` marks a main set.
- **`setType`**: included on every set. The enum is `REGULAR | DROP_SET | MYO_REP`.
- **`exercise.category`**: included on every set, so history can map a set to its muscle without the exercise list.
- **`planInstanceDays[].planDay`**: not included in history. The day number isn't available from history alone.

The [set fields in history](04-backend.md#set-fields-in-history) change isn't needed.

### Single exercise

`exercisesService.getExercise(id)` calls `GET /api/exercises/:id`. It returns:

```
{
  id, name, category, userId,
  prs: { maxWeight, maxReps, maxVolume },
  totalSets, totalVolume, lastPerformed, volumeProgression,
  history: {
    workoutInstanceId, volume, completedAt,
    sets: { weight, reps, setNumber, subSetNumber, setType }[]
  }[]
}
```

History covers completed instances only, sorted by `completedAt` ascending. Each session's sets include `subSetNumber` and `setType`.

### RIR ramp

`POST /api/mesocycles` creates every plan instance up front and assigns `rir = min(3, iterations - iterationNumber)`. For 5 weeks that's 3, 3, 2, 1, 0. The API has no deload flag. See [RIR ramp](04-backend.md#rir-ramp).

### Day names

`POST /api/plans` and `PUT /api/plans/:id` name each day's workout `"<plan name> - Day N"` and ignore any per-day name.

### Set updates

`PATCH /api/workout-instances/:id/sets/:setId` accepts only `setType`, and only `REGULAR`, `DROP_SET` or `MYO_REP`. It can't change `setNumber`. The logger renumbers a saved set by deleting it and posting it again with the new number.
