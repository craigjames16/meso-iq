# MesoIQ redesign spec

This spec describes the MesoIQ redesign and splits it into phases that a coding agent can complete one at a time. It covers the React Native client in this repo. The API changes the client depends on live in the backend repo and are described in [`04-backend.md`](04-backend.md).

The design source is the [MesoIQ Redesign canvas](https://claude.ai/artifact/8v8EXmYTm2wyWjBQtWTq1Q). Every screen in [`03-screens.md`](03-screens.md) names the canvas board it implements. When this spec and a board disagree, this spec wins. The boards are mid-fidelity wireframes with sample data.

## Files in this spec

- **[`README.md`](README.md)**: principles, conventions, phases and the definition of done. Start here.
- **[`01-design-system.md`](01-design-system.md)**: colour, radius, spacing and type tokens, UI primitives and chart primitives.
- **[`02-analytics.md`](02-analytics.md)**: every derived metric, with its formula, function signature, data source and required tests.
- **[`03-screens.md`](03-screens.md)**: one entry per screen, with target file, layout, data, states, interactions and acceptance criteria.
- **[`04-backend.md`](04-backend.md)**: API contract changes, and which client features each one gates.
- **[`baseline.md`](baseline.md)**: check results and API shapes recorded before the redesign.
- **[`implementation-notes.md`](implementation-notes.md)**: how the build departs from the spec, what stays gated, and how it was verified.

## Design principles

Apply these when a detail isn't covered elsewhere.

- **Colour has one job each**: white means a primary action or a selection. Signal orange means data. Green, gold and red mean status only. Technique colours (gold, violet, teal) mark drop, rest-pause and myo-rep sets.
- **Working sets only**: the app tracks working sets. There are no timers, durations, warm-up flags or per-set RIR fields anywhere.
- **Derive, don't store**: estimated one-rep max (e1RM), personal records (PRs), stalls and overload rates are computed on the client from data the API already returns. PRs need no schema change.
- **Cut data by time horizon**: the Data tab splits into Cycle (this block), Progress (months) and History (all time), not by data source.
- **Hard sets compare muscles**: set counts compare muscles with each other. Tonnage appears only in History, compared with itself over time.
- **Sharp and dense**: corners are small, screen gutters are 10px, and the tab bar is liquid glass. Keep screens clean: no legends or group headers where a label on the data does the job.

## How to work through the spec

1. Read the phase in [Phases](#phases) and the documents it references.
2. Create the phase branch.
3. Implement the phase, keeping the old screens working until their replacement lands.
4. Run the checks in [Conventions](#conventions) and walk the phase's acceptance criteria.
5. Commit, then open one pull request per phase.

**Note:** Phases 2, 3 and 6 contain items gated on backend work. Build those items behind the feature flags in [Feature flags](#feature-flags) so each phase can merge before the API ships.

## Conventions

- **Branching**: branch `redesign/base` from `main`, then one branch per phase named `redesign/phase-N-<slug>`.
- **Checks**: run `npx tsc --noEmit`, `npm run lint` and `npm test` before each commit. A phase can't add new type errors or lint errors beyond the baseline recorded in Phase 0.
- **Styling**: use `StyleSheet.create` with tokens from `src/theme`. Don't write hex values, raw radii or font sizes in components. The tokens file is the only place hex values appear.
- **Font weight**: the canvas uses weight 650 in places. Use `'600'` in React Native.
- **Numbers**: set fields, stats and chart labels use tabular numerals (`fontVariant: ['tabular-nums']`).
- **Units**: weights display in lb, matching the current app. Keep analytics functions unit-agnostic.
- **Icons**: keep `react-native-vector-icons/MaterialIcons` for standard glyphs. Draw custom glyphs (reorder handle, set-type tags) with `react-native-svg`.
- **Charts**: build new charts with `react-native-svg` through the primitives in `src/components/charts`. Don't add chart libraries.
- **Layering**: API calls stay in `src/services`. Pure derivations go in `src/analytics` with unit tests. Screens get data through hooks in `src/hooks`.
- **Navigation**: keep the current root native stack and the Track, Data and Plan bottom tabs. Add routes to `RootStackParamList` in `src/navigation/AppNavigator.tsx`.
- **Accessibility**: every icon-only control gets an `accessibilityLabel` and a hit area of at least 44×44pt, using `hitSlop` where the visual is smaller.

### Feature flags

Create `src/config/features.ts` in Phase 1. Each flag defaults to `false` and flips to `true` once its backend change ships.

- **`REST_PAUSE_SETS`**: shows the Rest-pause option in the set menu. Gated on `REST_PAUSE` in the set type enum.
- **`DAY_NAMES`**: makes day names editable in the program builder. Gated on per-day `name` in plan create and update.
- **`PROGRAM_TARGETS`**: shows rep ranges and starting sets in the builder and program detail, and seeds new sessions from `startingSets`. Gated on `repMin`, `repMax` and `startingSets`.
- **`CYCLE_START_OPTIONS`**: shows the start date row in the Start a cycle sheet. Gated on the cycle start date field.

## Phases

| Phase | Scope | Depends on | Backend gate |
|---|---|---|---|
| 0 | Prep and baseline | — | — |
| 1 | Design system, primitives, charts, tab bar | 0 | — |
| 2 | Workout logger | 1 | Rest-pause only |
| 3 | Track tab: Today, complete, off-plan | 1, 4 | — |
| 4 | Analytics layer | 0 | — |
| 5 | Data tab | 1, 4 | — |
| 6 | Plan tab | 1, 4 | Day names, targets, start date |
| 7 | Sign in, sign up, account | 1 | — |
| 8 | Cleanup and accessibility pass | all | — |

Phase 4 has no UI and can run in parallel with Phase 1 and Phase 2.

### Phase 0: Prep

`main` has uncommitted work in progress: `WorkoutCompleteScreen.tsx`, `workoutTrackingResolver.ts`, `workoutVolume.ts`, `userDataExportService.ts` and edits in about ten other files. Ask the owner to commit or stash it before you branch. Don't discard it.

1. Confirm the working tree is clean, then create `redesign/base`.
2. Run the three checks and record the results in `docs/redesign/baseline.md`, so later phases don't chase existing failures.
3. Confirm Jest runs a plain TypeScript test file under `src/**/__tests__`. The `react-native` preset handles this through Babel.
4. Record the actual API response shape of `GET /api/workout-instances/history` and `GET /api/exercises/:id` in `baseline.md`. Confirm whether each set includes `subSetNumber` and `setType`. Phase 4 depends on this.

**Done when:** the tree is clean, `baseline.md` exists, and a trivial test in `src/analytics/__tests__` passes.

### Phase 1: Design system

Read [`01-design-system.md`](01-design-system.md).

1. Add `src/theme/tokens.ts` and `src/theme/index.ts`.
2. Rewrite `src/theme/colors.ts` so `themeColors` maps its keys onto the new tokens. About 44 files import it, and the alias keeps them compiling until they are rebuilt.
3. Build the UI primitives in `src/components/ui/`.
4. Build the chart primitives in `src/components/charts/`.
5. Restyle `src/components/GlassTabBar.tsx` to the new tab bar spec.
6. Add `src/config/features.ts`.
7. Add a development-only `StyleGuideScreen` (registered only when `__DEV__`) that renders every primitive and chart with sample data.

**Done when:** the style guide screen renders every primitive in each of its variants, the tab bar matches the Track board, and the existing screens still work.

### Phase 2: Workout logger

Read [Workout logger](03-screens.md#workout-logger), [Set menu](03-screens.md#set-menu-sheet), [Add exercise](03-screens.md#add-exercise-sheet) and [Create exercise](03-screens.md#create-exercise-sheet).

1. Rebuild `ExerciseTrackingCard.tsx` with the new set row, completed state and attached-set rows.
2. Replace the set type convert menu with the set menu sheet.
3. Restyle `WorkoutDetailScreen.tsx`: header, progress, Finish button.
4. Build the shared Add exercise sheet with Browse and Create modes. It replaces `AddExerciseModal` in the logger now and in the builder in Phase 6.
5. Add `REST_PAUSE` to the client `SetType` union behind `REST_PAUSE_SETS`.

The set persistence logic in `WorkoutInstanceContext.tsx` and `workoutTrackingResolver.ts` keeps its behaviour. This phase changes presentation and menus, not how sets save.

**Done when:** the logger acceptance criteria and the manual test script in [Workout logger](03-screens.md#workout-logger) pass.

### Phase 3: Track tab

Read [Today](03-screens.md#today), [Workout complete](03-screens.md#workout-complete) and [Off-plan sheet](03-screens.md#off-plan-sheet).

1. Rebuild `TrackScreen.tsx` as the Today screen.
2. Rebuild `WorkoutCompleteScreen.tsx`.
3. Build the off-plan sheet. It uses the existing `workoutService.createStandaloneWorkout()`, so it isn't gated.

**Done when:** each screen's acceptance criteria pass with a real account, including an account with no history.

### Phase 4: Analytics layer

Read [`02-analytics.md`](02-analytics.md).

1. Add `src/analytics/` with the pure functions and types it lists.
2. Add unit tests for every function in `src/analytics/__tests__`.
3. Add the data hooks in `src/hooks/`.

**Done when:** every listed test case passes and each hook returns typed data against a real account.

### Phase 5: Data tab

Read the Data section of [`03-screens.md`](03-screens.md#data-tab).

1. Rebuild `DataScreen.tsx` with the Cycle, Progress and History sub-tabs.
2. Rebuild `HeatmapScreen.tsx` as the full-year consistency view.
3. Add the read-only `PastSession` route.
4. Delete the `src/components/data/*` components once nothing imports them.

**Done when:** each sub-tab's acceptance criteria pass, and every number on screen traces to a function in `src/analytics`.

### Phase 6: Plan tab

Read the Plan section of [`03-screens.md`](03-screens.md#plan-tab).

1. Rebuild `PlanScreen.tsx` with the active cycle card and the Programs and Exercises sub-tabs.
2. Rebuild `PlanDetailScreen.tsx`, `EditPlanScreen.tsx` (the builder) and `MesocycleDetailScreen.tsx`.
3. Build the New program sheet and the Start a cycle sheet.
4. Rebuild `ExerciseDetailScreen.tsx` and the Edit exercise sheet.
5. Wire gated fields behind `DAY_NAMES`, `PROGRAM_TARGETS` and `CYCLE_START_OPTIONS`.

**Done when:** you can create a program by hand and from a description, start a cycle, and log day 1 from Today, all on the new screens.

### Phase 7: Sign in, sign up and account

Restyle `SignInScreen.tsx`, `SignUpScreen.tsx` and `AccountSettingsScreen.tsx`. See [Sign in and account](03-screens.md#sign-in-and-account).

### Phase 8: Cleanup

1. Remove `react-native-chart-kit`, and remove `echarts`, `@wuba/react-native-echarts`, `react-native-calendars` and `@shopify/react-native-skia` if nothing imports them.
2. Delete unused components: `WorkoutHeatmap`, `WorkoutCalendar`, `WeekViewCards`, `ExerciseHistoryModal`, the old `components/plan/*` and `components/exercise/*` tabs, and `HomeScreen.tsx` if it's unreachable.
3. Delete the `themeColors` alias and any remaining hex literals outside `src/theme`.
4. Run an accessibility pass: labels, hit areas, and Dynamic Type up to the largest standard size without clipped numbers.
5. Remove the iOS pods for removed native libraries and confirm a clean iOS build.

## Definition of done

A phase is done when all of the following hold:

- The three checks pass with no new failures against `baseline.md`.
- No hex values, raw radii or raw font sizes appear in files the phase touched, outside `src/theme`.
- Each screen matches its board in structure, tokens and spacing. Sample data can differ.
- Each screen handles loading, empty and error states as its entry describes.
- Every icon-only control has an accessibility label.
- Logging a full workout still works end to end.

## Corrections to the canvas notes

- **Day names**: the Plan note says day names need a new nullable column. `workout.name` already exists, and each plan day's workout carries it. The API only needs to accept a per-day `name` in plan create and update, and to stop defaulting it to "Plan - Day N". See [`04-backend.md`](04-backend.md#per-day-names).
- **Off-plan sessions**: the client already creates standalone sessions through `POST /api/workout-instances` (`workoutService.createStandaloneWorkout`). The off-plan sheet needs no backend change.

## Open decisions

The owner decides these. Until then, build the default shown.

- **Deleting an exercise with history**: does it delete logged sets? Default: the Edit exercise sheet states the count of logged sessions and asks for confirmation. Delete behaviour stays whatever the API does today.
- **Off-plan sessions and adherence**: default: they count toward Data (sets, tonnage, e1RM, streak) but not toward a cycle's adherence.
- **Attached sets in counts**: default: set counts and hard sets use main sets only. Volume and tonnage include attached sets.
- **Where the RIR ramp comes from**: default: the Start a cycle sheet shows the ramp the API assigns to each plan instance (`rir`). If the API doesn't assign one, the sheet shows it as a preview only. See [`04-backend.md`](04-backend.md#rir-ramp).
