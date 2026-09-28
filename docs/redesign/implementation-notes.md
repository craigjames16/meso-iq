# Implementation notes

This page records how the redesign was built: where it departs from the spec, what stays gated on the API, and how it was verified. The spec itself is in [`README.md`](README.md). Analytics refinements are listed in [`02-analytics.md`](02-analytics.md#implementation-notes).

## Branches

Each phase is one commit on its own branch, stacked in build order: `redesign/base` → `phase-1-design-system` → `phase-4-analytics` → `phase-2-logger` → `phase-3-track` → `phase-5-data` → `phase-6-plan` → `phase-7-account` → `phase-8-cleanup`. Phase 4 comes before Phase 2 because the logger's Add exercise sheet reads last-performed dates from the analytics hooks.

## Verification

The checks end cleaner than the [baseline](baseline.md):

- **`npx tsc --noEmit`**: no errors.
- **`npm run lint`**: 0 errors and 1 warning (a baseline `dot-notation` warning in `src/api/client.ts`), down from 48 errors.
- **`npm test`**: every suite passes, including `App.test.tsx`, which failed at baseline. `jest.setup.js` now mocks AsyncStorage, liquid glass and safe-area insets.

A clean Debug build for the iOS simulator succeeds after `pod install`, and Metro bundles the release JavaScript without errors.

Screen behaviour is covered by render tests in `src/screens/__tests__`. They mount each screen with mocked services and assert on what it shows. They walk most of the logger's manual test script, and check that every pressable has text or an accessibility label.

**Note:** nothing here was run against a live account. Sign-in needs credentials, so the acceptance criteria that say "with a real account" still need a manual pass on a device.

## Departures from the spec

- **RIR ramp**: the Start a cycle sheet previews the API's current rule, `min(3, weeks − week)`, which ends at RIR 0 rather than a deload week. The caption says so. It switches when the API adopts the rule in [`04-backend.md`](04-backend.md#rir-ramp).
- **Default day names**: the API names days "<plan> - Day N". Screens show those as the day's two main muscles ("Chest & Triceps"), the default the backend spec proposes. Real names show as-is.
- **Reorder and swipe**: `react-native-gesture-handler` and `react-native-reanimated` aren't direct dependencies, so the builder uses the spec's fallback: long-press a day or exercise for Move up, Move down and Remove. The first day's hint says so.
- **Renumbering saved sets**: the set `PATCH` endpoint only changes `setType`. Duplicate, Insert below and Delete renumber saved sets by deleting and re-posting them.
- **Editing finished workouts**: Past session's Edit opens the logger, which now allows edits on a finished workout and shows Done instead of Finish.
- **Sign-up**: keeps the Privacy Policy and Terms checkbox, which the board omits. The password minimum rises from 6 to 8 to match the field hint.
- **Workout complete**: "Next: Upper" omits the weekday, because plan days aren't tied to dates.
- **This week weekdays**: each day cell is labelled with a weekday rather than its slot number, so you can see which days the workouts land on without counting slots. The API stores no scheduled date for a plan day, so [`planWeekDates`](../../src/analytics/calendar.ts) reads the date from `completedAt` for finished days and projects the rest one calendar day per slot from today's slot. A projected weekday is announced as "expected Friday"; the slot number stays in the accessibility label and shows in the cell when no date can be fixed. Rest days occupy slots, so the projection matches the calendar for any plan whose week is seven slots long.
- **Consistency calendars**: two columns, per the spec, rather than the board's three.
- **Working sets window**: the Cycle card counts a rolling 7 days ending today rather than the spec's Monday-start week. A Monday-start count read as a partial week against complete ones for most of the week, so the card said little before the weekend. The tick stays a 4-week average, now the mean of the four rolling windows behind the current one instead of the four preceding ISO weeks. `weeklyHardSets` and `fourWeekAverage` are gone; [`rollingHardSets`](../../src/analytics/volume.ts) replaces them. The tradeoff is recorded in [`02-analytics.md`](02-analytics.md#rolling-hard-sets-per-muscle): a rolling window lags the step into a deload by up to six days.
- **Type scale**: components use named sizes from `size` in `src/theme/type.ts` rather than raw numbers.
- **Brand mark**: the spec has no logo. `LogoMark` in `src/components/ui/glyphs.tsx` draws one, and it ships in two places: `ScreenHeader`, so it shows once on each of Track, Data and Plan, and the `AuthLayout` lockup beside the wordmark. Detail screens, sheets and the logger have no mark — the top-left there belongs to Back. The canvas boards match.
- **Chart info sheets**: the spec has no info affordance on charts. Every chart that shows a derived number now carries an `InfoButton` whose sheet defines the metric, so the definitions in [`02-analytics.md`](02-analytics.md) reach the reader. The copy lives in `src/components/ui/chartInfo.ts`; charts without an `InfoButton` are the presentational ones (sparklines inside rows, the week dots).
- **Tab bar selection**: the board draws the active tab as a solid white pill. It ships as a lighter glass capsule that slides between tabs instead, because solid white at that size reads as a button placed on the bar rather than the bar's own material responding. The shape and motion are specified in [`01-design-system.md`](01-design-system.md#glass-tab-bar).

## Gated on the API

These are built and hidden behind flags in `src/config/features.ts`, all `false`:

- **`REST_PAUSE_SETS`**: Rest-pause in the set menu. The `PATCH` endpoint rejects `REST_PAUSE` today.
- **`DAY_NAMES`**: inline day renaming in the builder, and `name` in the plan payload.
- **`PROGRAM_TARGETS`**: rep-range chips and the targets sheet in the builder, "4 × 8–12" on Program and Exercise detail, `startingSets` in the volume profile, and seeding new logger rows from `startingSets`.
- **`CYCLE_START_OPTIONS`**: the Starts row in Start a cycle, which sends `startDate`.
- **`PLAN_DELETE`**: "Clean up" on the drafts row.

## Removed

Phase 8 removed `react-native-chart-kit`, `echarts`, `@wuba/react-native-echarts`, `react-native-calendars` and `@shopify/react-native-skia`, their pods, the old `components/data`, `components/plan` and `components/exercise` tabs, the old modals and drawer, `HomeScreen`, the `themeColors` alias and the auth background image.

`react-native-popover-view` and `@react-native-picker/picker` are no longer imported either. They weren't on the removal list, so they're still in `package.json`.
