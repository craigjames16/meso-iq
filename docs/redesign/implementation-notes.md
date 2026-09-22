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
- **Consistency calendars**: two columns, per the spec, rather than the board's three.
- **Type scale**: components use named sizes from `size` in `src/theme/type.ts` rather than raw numbers.

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
