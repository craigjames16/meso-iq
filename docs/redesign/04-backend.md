# Backend changes

This document lists the API changes the redesign needs. They belong in the API repo, which the client reaches at `https://api.meso-iq.com` (production) and `http://10.0.0.208:3000` (development). The client repo doesn't contain the API, so confirm each current shape in the API code before you change it.

Most of the redesign needs no backend change. The client derives every metric from existing endpoints, as described in [`02-analytics.md`](02-analytics.md). The changes below are grouped by what they unlock. Each gated client feature sits behind a flag in `src/config/features.ts` until its change ships.

## Summary

| Change | Required? | Unlocks | Client flag |
|---|---|---|---|
| [Set fields in history](#set-fields-in-history) | Required if missing | Correct hard-set counts and e1RM | — |
| [`REST_PAUSE` set type](#rest_pause-set-type) | Required | Rest-pause in the set menu | `REST_PAUSE_SETS` |
| [Per-day names](#per-day-names) | Required | Editable day names | `DAY_NAMES` |
| [Rep ranges and starting sets](#rep-ranges-and-starting-sets) | Required | Rep ranges, starting sets, volume profile | `PROGRAM_TARGETS` |
| [RIR ramp](#rir-ramp) | Confirm | Accurate ramp preview | — |
| [Cycle start date](#cycle-start-date) | Optional | Start date row | `CYCLE_START_OPTIONS` |
| [Plan delete](#plan-delete) | Optional | "Clean up" empty drafts | — |
| [AI draft mode](#ai-draft-mode) | Optional | Unsaved AI drafts | — |
| [Exercise delete semantics](#exercise-delete-semantics) | Decision | Accurate delete confirmation | — |
| [Optional aggregate endpoints](#optional-aggregate-endpoints) | Optional | Faster Progress tab | — |

## Set fields in history

`GET /api/workout-instances/history` must return `subSetNumber` and `setType` on each entry of `exerciseSets`, as `GET /api/workout-instances/:id` does. Without them the client can't tell attached sets from main sets, and hard-set counts and e1RM include drops.

Phase 0 of the [README](README.md#phase-0-prep) checks whether this is needed.

**Status:** not needed. The client calls `GET /api/workout-instances?completed=true`, which returns every `ExerciseSet` column, including `subSetNumber` and `setType`. See [`baseline.md`](baseline.md#training-history).

## `REST_PAUSE` set type

Add `REST_PAUSE` to the set type enum, so it reads `REGULAR | DROP_SET | REST_PAUSE | MYO_REP`.

- `POST /api/workout-instances/:id/sets` accepts it in `sets[].setType`.
- `PATCH /api/workout-instances/:id/sets/:setId` accepts it in `setType`.
- Rest-pause sets use `subSetNumber` for bursts, as drop and myo-rep sets do.
- The migration only adds an enum value. Existing rows are unchanged.

## Per-day names

Each plan day already points to a workout, and `workout.name` already exists. Today the API names it "Plan - Day N". No new column is needed.

- `POST /api/plans` and `PUT /api/plans/:id` (called by `plansService.createPlan` and `updatePlan`) accept an optional `name` per day: `days: [{ name?: string; isRestDay; workoutExercises }]`.
- When `name` is present, set it on that day's workout. Trim it and cap it at 40 characters.
- When `name` is absent on create, default to a name built from the day's muscles ("Chest & Triceps"), or "Day N" when empty. Don't include the plan name, because the client always shows the program next to the day.
- On update, leave an existing name unchanged when `name` is absent.
- `create-with-ai` sets meaningful day names ("Push", "Upper").

## Rep ranges and starting sets

Add three nullable integer columns to the workout exercise model (the row behind `workoutExercises`):

- **`repMin`**: the bottom of the rep range, 1–50.
- **`repMax`**: the top of the rep range, from `repMin` to 50.
- **`startingSets`**: sets in week 1, 1–10. `null` means 2, which matches the client's `defaultTwoSets()`.

Contract:

- Plan create and update accept `repMin`, `repMax` and `startingSets` per entry in `workoutExercises`.
- `GET /api/plans` and `GET /api/plans/:id` return them.
- Starting a plan day (`POST` to `PLAN_INSTANCES.START_WORKOUT`) returns them on the instance's `workoutExercises`, so the logger can seed `startingSets` blank rows.
- `create-with-ai` fills them.
- Existing rows stay `null`. The client treats `null` as "no rep range" and 2 starting sets.

**Note:** sets rise across the cycle, as the Start a cycle sheet explains. If the API doesn't progress set counts week to week today, the client keeps seeding each week from the previous week's logged main-set count. Decide in the API whether progression lives there.

## RIR ramp

Each plan instance returns `rir`, and the logger header shows it. Confirm how the API assigns it when a mesocycle is created and when `POST /api/plan-instances` creates the next week.

- If the API already ramps RIR, document the rule here so the Start a cycle sheet previews the same numbers.

**Current rule:** `POST /api/mesocycles` creates every week up front with `rir = min(3, iterations - iterationNumber)`. For 5 weeks that's 3, 3, 2, 1, 0. There's no deload flag, so the last week is RIR 0. The Start a cycle sheet previews this rule until the API adopts the one below.
- If it doesn't, adopt this rule: for `iterations = n`, weeks 1 to n−1 get RIR `max(0, 3 − (week − 1))`, and week n is a deload. Mark the deload with RIR `null`, or with a new `isDeload` boolean on the plan instance, and return it.

## Cycle start date

Optional. `POST /api/mesocycles` accepts an optional `startDate` (ISO date). The API stores it as the mesocycle's `startedAt` when present. Without it, the current behaviour stays.

## Plan delete

Optional. Add `DELETE /api/plans/:id`.

- Return `409 Conflict` when a mesocycle that isn't complete uses the plan.
- When completed mesocycles use it, archive the plan (hide it from `GET /api/plans`) instead of deleting it, so history keeps its program name.

The client adds `PLANS.DELETE` to `src/config/env.ts` and shows "Clean up" once this exists.

## AI draft mode

Optional. `POST /api/plans/create-with-ai` accepts `{ prompt, draft: true }`. In draft mode it returns the plan payload without saving it, in the same shape as `GET /api/plans/:id` with no IDs. The builder then saves it through `POST /api/plans`. Without draft mode, the client keeps today's behaviour, where the returned plan is already saved.

## Exercise delete semantics

This is an open decision. See the [README](README.md#open-decisions). Today `DELETE /api/exercises/:id` behaves in a way the client doesn't document.

- Return the counts the confirmation needs from `GET /api/exercises/:id`: `programCount` and `sessionCount`.
- Pick one behaviour and document it here:
  - **Block**: return `409` when logged sets exist.
  - **Archive**: hide the exercise from the library and keep its history.
  - **Cascade**: delete its sets too.

  Archive keeps charts and history intact and is the least surprising.

## Optional aggregate endpoints

The Progress tab computes overload rates and rep-range shares by fetching every performed exercise (`useProgress` in [`02-analytics.md`](02-analytics.md#hooks)). That works, but costs one request per exercise. If it's slow, add these to the dashboard route:

- **`GET /api/dashboard?data=e1rmSeries&from=YYYY-MM-DD`**: `{ exercises: [{ id, name, category, sessions: [{ workoutInstanceId, completedAt, sets: [{ weight, reps, setNumber, subSetNumber, setType }] }] }] }`. This is the same session shape as `GET /api/exercises/:id`, for all exercises, so the client reuses its analytics functions unchanged.
- **`GET /api/dashboard?data=repRangeDistribution&from=YYYY-MM-DD`**: `{ buckets: { '1-5': n, '6-8': n, '9-12': n, '13-15': n, '16+': n } }`, counting main sets with `reps > 0`.

Keep the derivation rules in [`02-analytics.md`](02-analytics.md#set-rules) as the reference, so the client and server agree.
