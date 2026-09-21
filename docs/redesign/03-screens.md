# Screens

This document specifies every screen and sheet in the redesign. Each entry names its canvas board, target file, sections in order, data, states, interactions and acceptance criteria. Tokens and primitives come from [`01-design-system.md`](01-design-system.md). Metric functions come from [`02-analytics.md`](02-analytics.md).

Board names refer to the [MesoIQ Redesign canvas](https://claude.ai/artifact/8v8EXmYTm2wyWjBQtWTq1Q). The FlowMap board shows how the screens connect.

## Routes

The root native stack and the three bottom tabs stay. Changes to `RootStackParamList` in `src/navigation/AppNavigator.tsx`:

| Route | Params | Status |
|---|---|---|
| `Main` (tabs Track, Data, Plan) | — | Keep |
| `WorkoutDetail` | `{ workoutInstanceId }` | Keep; becomes the logger |
| `WorkoutComplete` | `{ workoutInstanceId }` | Keep; rebuilt |
| `PastSession` | `{ workoutInstanceId }` | New |
| `Heatmap` | `{ year: number }` | Change params from `{ mesocycleId }` |
| `PlanDetail` | `{ planId }` | Keep; rebuilt |
| `EditPlan` | `{ planId?: number; draftFromAI?: boolean }` | Change: `planId` optional for new programs |
| `MesocycleDetail` | `{ mesocycleId }` | Keep; rebuilt |
| `ExerciseDetail` | `{ exerciseId }` | Keep; rebuilt |
| `AccountSettings` | — | Keep; restyled |

Sheets are components rendered with the `Sheet` primitive, not routes.

## States every screen handles

- **Loading**: skeleton blocks shaped like the content. Don't show a full-screen spinner after the first load. Pull to refresh on every tab screen.
- **Empty**: one line of copy and, where it helps, one action. Each entry lists its empty copy.
- **Error**: an `ErrorState` card with "Couldn't load this. Pull to try again." Keep any cached data on screen.
- **Partial data**: a metric that needs more history than exists shows "Not enough sessions yet" in `text.muted` in place of the number. It never shows zero or NaN.

---

## Track tab

### Today

- **Board**: `Track.dc.html`
- **File**: `src/screens/main/TrackScreen.tsx` (rebuild)
- **Data**: `ScheduleContext` (current mesocycle, upcoming days, history), `useTrainingHistory()`

Sections, top to bottom:

1. **Header**: "Today" (`tabTitle`), the date below in `meta`, and on the right a streak chip ("12 WK", from `weekStreak`) and the avatar `IconButton`, which opens `AccountSettings`.
2. **Next workout card** (hero `Card`, padding 16):
   - Label: "MESO 3 · WEEK 2 · DAY 3" (mesocycle name, iteration number, day number).
   - Title: the workout name ("Push") in `detailTitle`.
   - Meta: program name · exercise count · starting set count.
   - Exercise chips: the first three exercise names, then "+N".
   - Carry-over line: "Last Push was 6 days ago at 8,214 lb. Opening set target: Cable Flyes 3 × 12 @ 45 lb." Build it from the last completed session of the same `workoutId`: days since, its tonnage, and for the first exercise its main-set count, first-set reps and first-set weight. Hide the line when there is no earlier session.
   - Play button: a white square with `radius.play` and a play glyph. It starts the day through the existing `startWorkout(instanceId, dayId)` flow and navigates to `WorkoutDetail`.
3. **Today hits**: `SectionLabel` "TODAY HITS", then one compact row per muscle the day's exercises train, with `daysSinceTrained` ("Chest · 6 days").
4. **This week**: "This week" with "2 of 5 done" on the right. One row of day cells for the current plan instance. Done days show the success tint, today has a white outline, rest days are `surface.subtle`, and each cell shows its hard-set count when done.
5. **Recent**: `SectionLabel` "Recent" with "All workouts" (switches to Data › History). Three `ListRow`s: "Day 2 · Pull", meta "Wed 16 · 14 sets · 8,760 lb", right value tonnage, and a delta against the previous session of the same workout. Tapping a row opens `PastSession`.
6. **Log something off-plan**: a secondary full-width button that opens the [Off-plan sheet](#off-plan-sheet).

Variants:

- **In-progress session**: the hero card shows "Resume" and the logged set count, and the play button resumes it.
- **Rest day**: the hero title is "Rest day" and the primary action is "Mark rest day done", which calls `completeRestDay`.
- **No active cycle**: the hero card reads "No cycle running" with a "Start a cycle" button that switches to the Plan tab. The off-plan button stays.
- **New account**: the hero card reads "Build your first program" with a button to the Plan tab. Hide Today hits, This week and Recent.

Acceptance:

- The play button starts the correct plan day, and the carry-over line matches the last session of that workout.
- Existing behaviour around creating the next plan instance when a week completes (currently in `TrackScreen.tsx`) is preserved.
- There are no timers or duration estimates anywhere on the screen.

### Workout logger

- **Board**: `WorkoutLogger.dc.html`
- **Files**: `src/screens/workout/WorkoutDetailScreen.tsx`, `src/components/ExerciseTrackingCard.tsx` (move to `src/components/logger/ExerciseCard.tsx` and `SetRow.tsx`)
- **Data**: `WorkoutInstanceContext`, `workoutTrackingResolver.ts`, `workoutService`

Header:

- Back chevron. The title is the workout name ("Legs"). The meta line is "Sept-3D · Week 1 · Day 5" (mesocycle · week · day), or "Off-plan" for a standalone session.
- A "TARGET RIR 2" tag from `planInstance.rir`, shown only with plan context. This is the only RIR on the screen.
- Progress: "5 of 12 sets", counting completed main sets over all main sets.

Exercise card (one per exercise):

- Exercise name (`cardTitle`) and an exercise menu `IconButton` (⋮) with Move up, Move down, View history (opens `ExerciseDetail`) and Remove exercise.
- Column labels once per card: SET, WEIGHT, REPS, in `label` style.
- Set rows, then "+ Add set" as a dashed ghost button.

Set row layout, left to right, with 8px gaps:

| Element | Size | Spec |
|---|---|---|
| Badge | 26×26 | `radius.badge`, `surface.field`; shows the set number |
| Weight field | flex 1 | `setField` text, centred, `surface.field`, `border.field`, `radius.field`, 9px vertical padding |
| × | 10 wide | `text.disabled`, 11px |
| Reps field | flex 1 | same as weight |
| Checkbox | 30×30 | `radius.field`, 1.5px `border.strong`; checked is `success.base` fill with a dark tick |
| Menu | 20 wide | ⋮ glyph in `text.faint`; opens the [Set menu sheet](#set-menu-sheet) |

- **"Last" line**: under every row, "Last 130 × 14" in `meta` and `text.faint`. It shows the matching set (same `setNumber` and `subSetNumber`) from the previous session of this exercise. If there's none, the line is omitted, not blank.
- **Active field**: 1.5px `action.fill` border.
- **Completed row**: row background `success.rowBg` with a 3px `success.base` left rail. Fields use `success.fieldBg`, `success.fieldBorder` and `success.fieldText`. The badge uses `success.badgeBg` and `success.badgeText`. The "Last" line uses `success.lastText`. Animate the tint in over 180ms, as the current card does.
- **Attached rows** (drop, rest-pause, myo): indented 16px. They have a 2px left rail in the technique colour and a badge showing `D1`/`D2`, `+1`/`+2` or `M1`/`M2` in the technique colour on its `tagBg`. After the last attached row of a parent, show a small "+ Add drop" (or "+ Add burst", "+ Add myo set") text button in the technique colour.
- **Not on the row**: timers, durations, rest countdowns, per-row RIR, warm-up flags, group headers and legends.

Footer: a sticky white `Button`, "Finish workout · 5 of 12 sets". It calls the existing complete flow and navigates to `WorkoutComplete`. If sets are unchecked, confirm first: "3 sets aren't checked. Finish anyway?"

Behaviour that must not change:

- How sets are created, updated, checked and deleted through `WorkoutInstanceContext` and `workoutService`.
- New exercises start with two blank sets (`defaultTwoSets`), until `PROGRAM_TARGETS` is on. Then they start with the plan's `startingSets`.
- Prefill from the last session, as the resolver does today.

Manual test script:

1. Start a plan day. Enter weight and reps on set 1 and check it. The row turns green.
2. Open the set menu on set 2 and choose Drop set. An attached `D1` row appears under set 2 with a gold rail.
3. Add a second drop. It shows `D2`. Check both. They turn green and keep their gold rail.
4. Change set 2 back to Straight set. Its attached rows are removed after a confirmation.
5. Duplicate set 1 and insert a set below set 3. Numbering stays sequential.
6. Delete a set. Numbering closes the gap.
7. Add an exercise through the sheet, then finish. Workout complete shows the right set count.
8. Kill and relaunch the app mid-session. Everything logged is still there.

### Set menu sheet

- **Board**: `SetMenu.dc.html`
- **File**: `src/components/logger/SetMenuSheet.tsx`

- **Title**: "Set 2", with subtitle "Seated Leg Curls · 130 × 14".
- **SET TYPE**: four option rows, each with a tag, name and one-line description:
  - Straight set (`—`): "one set, nothing attached"
  - Drop set (`D1`): "weight comes down, no rest between drops"
  - Rest-pause (`+1`): "same weight, short rest between bursts". Hidden unless `REST_PAUSE_SETS` is on.
  - Myo-reps (`M1`): "same weight, a few breaths, small rep target"
- **Selected type**: `technique.*.selectedBg` background, `selectedBorder` border, and a filled check in the technique colour. Straight set uses `surface.inset` with a white check.
- **Actions**, separated by dividers: Duplicate set, Insert set below, and Delete set (in `danger.base`).

Behaviour:

- Choosing a type calls `workoutService.convertSetType` and adds one blank attached row, as `WorkoutDetailScreen` does today. Choosing Straight set removes attached rows after confirming.
- There are no drop-set settings (percent, count). Attached rows are added one at a time from the logger.
- The sheet opens on attached rows too. There it shows only Duplicate, Insert below and Delete.

### Add exercise sheet

- **Board**: `AddExerciseSheet.dc.html`
- **File**: `src/components/exercise/AddExerciseSheet.tsx`, shared by the logger and the program builder

- **Title**: "Add exercise", with the context as subtitle ("Legs · Week 1 · Day 5", or the builder day name).
- **Mode**: a `Segmented` control with Browse and Create.
- **Browse**:
  - A search field ("Search 89 exercises").
  - Muscle filter chips: All, then the eight muscles, scrolling horizontally.
  - "RECENTLY USED": exercises by last performed date, with meta "Quads · 5 days ago", followed by the rest A–Z.
  - Rows are multi-select, with a check on the right.
- **Footer**: a white button, "Add 2 exercises", disabled at zero.

Data: `exercisesService.getExercises()` plus last-performed dates from `useTrainingHistory()`.

Acceptance: search matches on any word in the name, case-insensitively. Selections survive switching filters.

### Create exercise sheet

- **Board**: `CreateExerciseSheet.dc.html`
- **File**: Create mode of `AddExerciseSheet.tsx`

- **NAME**: a text field.
- **ALREADY IN YOUR LIBRARY**: as you type (debounced 200ms), show up to three near-duplicates with name, muscle and session count, each with a "Use" button. Match when every word in the query is a substring of the name, or the normalised edit distance is at most 0.3. Hide the section when nothing matches.
- **MUSCLE GROUP**: single-select chips for the eight muscles.
- **Footer**: a white button, "Create & add", disabled until a name and a muscle are set. It calls `exercisesService.createExercise`, then adds the new exercise.

### Off-plan sheet

- **Board**: `OffPlanSheet.dc.html`
- **File**: `src/components/track/OffPlanSheet.tsx`

- **Title**: "Log something off-plan", with subtitle "Counts toward your data, not your cycle's adherence".
- **Three options**, as selectable cards:
  - **Repeat a past session**: "Same exercises, last time's numbers prefilled", followed by the three most recent sessions ("Pull · Wed 16 · 14 sets · 8,760 lb").
  - **Pick a day from a program**: "Any day from any program you've built". Tapping it opens a picker of program › day.
  - **Start empty**: "Add exercises as you go".
- **Footer**: a white button, "Start workout".

Behaviour: every option calls `workoutService.createStandaloneWorkout(name)`, then `addExercise` with the chosen exercise IDs. The resolver's prefill supplies last time's numbers. Name the session after its source ("Pull", "Upper"), or "Workout" when empty. Mark it off-plan in analytics (`planned: false`) because it has no `planInstanceDays`.

### Workout complete

- **Board**: `WorkoutComplete.dc.html`
- **File**: `src/screens/workout/WorkoutCompleteScreen.tsx` (rebuild)
- **Data**: the completed instance, `useTrainingHistory()`, `sessionPRs`

1. **Header**: "Workout complete", with meta "Legs · Sept-3D · Week 1 · Day 5".
2. **Stat tiles**: Sets (hard sets), lb lifted (tonnage), and the delta against the last session of the same workout ("+3.1% vs last Legs").
3. **PERSONAL RECORDS**: one row per `SessionPR`, for example "Seated Leg Curls · Est. 1RM 162 lb · +4 lb" or "Machine Calve Press · Most reps at 250 lb · 16". Hide the section when there are none.
4. **EXERCISE BY EXERCISE**: one row per exercise with "Top set 85 × 11" and the top-set e1RM delta against that exercise's previous session.
5. **THIS CYCLE**: "Week 1 · 4 of 5 days", then "Next: Upper, Saturday". Hidden for off-plan sessions.
6. **Done**: a white button that returns to Today.

---

## Data tab

`src/screens/main/DataScreen.tsx` holds a header and a `Segmented` control with Cycle, Progress and History. Each sub-tab is its own component in `src/screens/data/`. The header's right side holds the sub-tab's filter chip: the mesocycle picker on Cycle, the time range on Progress, and the year on History. Remember the last sub-tab for the session.

### Cycle

- **Board**: `Main.dc.html`
- **File**: `src/screens/data/CycleTab.tsx`
- **Data**: `useCycleStats(mesocycleId)`, `useTrainingHistory()`
- **Filter**: a mesocycle chip ("Mesocycle 3"), defaulting to the active cycle, else the latest.

1. **Hero**: "WEEK 4 OF 5 · RIR 1" as a label, then "PPL/Upper/Lower · 11 of 15 days logged".
2. **WHAT CHANGED**: up to three insight rows, in this priority:
   - A stalled lift (gold warning icon): "Rope Pushdowns has stalled", then "Est. 1RM flat at 147 lb for 3 sessions while sets went up. Deload it or swap the movement." Use the second sentence only when that lift's weekly sets rose over the same sessions.
   - The fastest riser: "Chest is your fastest riser", then "+8.4% est. 1RM per week across 3 chest lifts, best of any muscle this cycle."
   - Hide the card when there's nothing to say.
3. **Hard sets this week**: a card titled "Hard sets this week", with subtitle "Sets, not tonnage, comparable across muscles". It has one `BarRow` per muscle, sorted by count. Each bar has a tick at the 4-week average and a delta against it. The caption reads "Tick = your 4-week average. Tap a bar for the exercises behind it." Tapping a bar opens a sheet listing that muscle's exercises and set counts this week.
4. **Strength trend**: "Strength trend", with subtitle "Est. 1RM, this mesocycle" and an "All 89" link. The top five exercises by absolute change are shown as `ListRow`s with a `Sparkline`, the current e1RM and the delta. Stalled lifts show the delta in `danger.base`. The caption reads "Epley estimate from the heaviest working set each session." A row opens `ExerciseDetail`.
5. **This cycle vs. last**: "Weekly sets per muscle, week 4 of each". A `Radar` from `cycleRadar`, keyed "Meso 3 (now)" and "Meso 2". Hide it when there's no previous mesocycle.

Empty: "Start a cycle to see how it's going", with a button to the Plan tab.

### Progress

- **Board**: `Progress.dc.html`
- **File**: `src/screens/data/ProgressTab.tsx`
- **Data**: `useExerciseProgress(exerciseId, range)`, `useProgress(range)`
- **Filter**: a range chip: Last 3 months, Last 6 months (default), Last 12 months, All time.

1. **Exercise picker**: the exercise name as a tappable title with a chevron. It opens a searchable exercise list. It defaults to the exercise with the most sessions in the range.
2. **Hero**: "Est. 1RM · 18 sessions since March", then the current e1RM (`hero`) with "lb", then the change over the range ("+44 lb (+26%)").
3. **Line chart**: the e1RM series with a dashed trend line and PR rings, a y-axis with four ticks, and month labels. The inline key reads "Trend" and "Personal record".
4. **RECORDS FOR THIS LIFT**: a 2×2 grid of `StatTile`s: Heaviest set (225 × 5), Most reps (18 × 135), Best session volume (9,240) and Best est. 1RM (253 lb). Each shows its date.
5. **Where you actually train**: the exercise name, with subtitle "darker is more often". A `Matrix` from `weightRepMatrix` with weight rows and the rep columns ≤4 to 13+, followed by the generated caption.
6. **Rep ranges, all lifts**: "Share of your working sets". Five `BarRow`s from `repRangeShare`, showing percentages.
7. **Overload rate by muscle**: "Est. 1RM change per week · last 6 months". The range text follows the filter. It has one `BarRow` per muscle from `muscleOverloadRate`: positive values in `data.main`, negative values in `data.reference`. Muscles with `null` show "Not enough sessions". The caption reads "Slope of a fit through each muscle's est. 1RM series."

Empty: "Log a few sessions to see your progress."

### History

- **Board**: `History.dc.html`
- **File**: `src/screens/data/HistoryTab.tsx`
- **Data**: `useTrainingHistory()`, `useConsistency(year)`, `mesocyclesService.getMesocycles()`
- **Filter**: a year chip.

1. **Consistency card**: "Consistency · Last 26 weeks" with a "12 WK STREAK" tag, a 26-week `HeatGrid` (7 rows × 26 columns) with month labels, and two stats: "87% Planned days hit" and "4.2 Sessions / week". Tapping the card opens `Heatmap`.
2. **Tonnage per month**: "Total lb lifted, with 3-month average". `VerticalBars` for the year, with the white dashed `avg3` line and "so far" on the current month. The key reads "Monthly" and "3-month average".
3. **Mesocycles**: a section with an "All 3" link. Rows show "Meso 3 · PPL/Upper/Lower", an "ACTIVE" tag when running, meta "Aug 24 – now · 11 of 15 days" (active) or "Jun 15 – Aug 16 · 88% adherence" (done), and on the right the avg e1RM delta with the label "avg e1RM". A row opens `MesocycleDetail`.
4. **Sessions**: a section with an "All 247" link. `ListRow`s like the Today Recent list open `PastSession`. Show 10, then "Show more".
5. **ALL TIME**: four figures: lb lifted, sets logged, sessions and exercises used.

### Consistency (full year)

- **Board**: `Heatmap.dc.html`
- **File**: `src/screens/main/HeatmapScreen.tsx` (rebuild)
- **Params**: `{ year }`

- **Header**: `DetailHeader` "Consistency", with the year as a chip that cycles through years with data.
- **Stats**: Sessions, Current streak and Planned days hit.
- **Calendars**: twelve month calendars in a two-column grid, JAN to DEC. Each is a 7-column `HeatGrid` with Monday first, using `dayHeatLevels`.
- **Key**: a single row, "Rest" to "Big day", with the four heat colours. The caption reads "Shade is that day's hard sets. Tap a day to open the session."
- **Tap**: a day with one session opens `PastSession`. A day with several opens a small sheet listing them.

### Past session

- **Board**: `PastSession.dc.html`
- **File**: `src/screens/workout/PastSessionScreen.tsx` (new)
- **Params**: `{ workoutInstanceId }`

- **Header**: `DetailHeader` with an "Edit" action that opens `WorkoutDetail` for the same instance. The title is the workout name. The meta line is "Wed, Sep 16 · Meso 3 · Week 2 · Day 3", or "Off-plan".
- **Stat tiles**: Sets, lb lifted, and the delta against the last session of the same workout.
- **Exercise cards**: the name, with meta "4 sets · 5,880 lb" (or "+25 lb · 4 sets" for bodyweight-plus lifts). Read-only rows show the badge and "140 × 12". Attached rows are indented, with technique badges. There are no checkboxes, fields or menus.

Acceptance: this screen makes no writes. Editing happens only through the logger.

---

## Plan tab

`src/screens/main/PlanScreen.tsx` holds the header "Plan" with a "+" `IconButton` (New program) on the right, the active cycle card, and a `Segmented` control with Programs and Exercises.

### Programs

- **Board**: `Programs.dc.html`
- **Files**: `src/screens/main/PlanScreen.tsx`, `src/screens/plan/ProgramsTab.tsx`
- **Data**: `plansService.getPlans()`, `mesocyclesService.getMesocycles()`, `useCycleStats(activeId)`

1. **Active cycle card** (shown only while a mesocycle is `IN_PROGRESS`):
   - "ACTIVE CYCLE" label with "Week 2 of 5" on the right.
   - Title: "Meso 3 · PPL/Upper/Lower".
   - Meta: "11 of 15 days logged · 87% adherence · +6.1% est. 1RM so far".
   - Two secondary buttons. "Adjust cycle" opens `MesocycleDetail`. "End early" confirms, then calls `completeMesocycle`.
2. **Programs list**: one card per program with a real exercise in it. Each card shows the name, "N training days · M exercises", and a "RUNNING" tag on the program behind the active cycle. A card opens `PlanDetail`.
3. **Drafts row**: programs with no exercises collapse into one row: "2 empty drafts", with their names as meta. Its "Clean up" action needs a plan delete endpoint. Hide the action until [plan delete](04-backend.md#plan-delete) exists.

Empty: "No programs yet", with a white "New program" button.

### Exercises

- **Board**: `ExerciseLibrary.dc.html`
- **File**: `src/screens/plan/ExercisesTab.tsx`
- **Data**: `exercisesService.getExercises()`, `useTrainingHistory()`, `plansService.getPlans()`

- **Search**: "Search 89 exercises".
- **Filter chips**: All, then the eight muscles.
- **Sort**: a "Recently used" chip that toggles to A–Z. The meta reads "66 performed · 23 never".
- **List**: rows with name, muscle, and "last 3 days ago" or "never". A row opens `ExerciseDetail`.
- **Collapsed groups** at the bottom: "Never performed · 23" and "Not in any program · 41". Each expands in place.

### Program detail

- **Board**: `PlanDetail.dc.html`
- **File**: `src/screens/plan/PlanDetailScreen.tsx` (rebuild)

1. **Header**: `DetailHeader` with an "Edit" action (opens `EditPlan`). The title is the program name. The meta line is "3 training days · 4 rest · 12 exercises".
2. **STARTING SETS PER MUSCLE · WEEK 1**: `ProfileBars` from `programVolumeProfile`.
3. **Start a cycle from this**: a white button that opens the [Start a cycle sheet](#start-a-cycle-sheet). Disable it while another cycle is running, with the caption "Finish Meso 3 first."
4. **THE WEEK**: one card per training day: number, name, "4 exercises", and muscle tags. Tapping a card expands its exercise list. With `PROGRAM_TARGETS` on, each exercise shows "4 × 8–12" (starting sets × rep range). Consecutive rest days collapse into one row, "Days 6 & 7 Rest".
5. **Cycles**: the mesocycles run from this program, newest first, as rows like the History mesocycle list.

### Build or edit program

- **Board**: `PlanEdit.dc.html`
- **File**: `src/screens/plan/EditPlanScreen.tsx` (rebuild)
- **Params**: `{ planId?, draftFromAI? }`

1. **Nav row**: "Cancel", the title ("New program" or "Edit program"), and "Save". Save is `data.reference` while invalid and white while valid. Cancel with unsaved changes confirms first.
2. **NAME**: a `TextField`.
3. **AS YOU BUILD IT**: a live readout card with "4 days · 11 exercises · 46 starting sets", `ProfileBars` (gold under `LOW_VOLUME_SETS`), and one warning line for the lowest muscle (see [`02-analytics.md`](02-analytics.md#program-volume-profile)). It updates on every change.
4. **Day cards**:
   - A reorder handle, then "Day 1 · Upper". With `DAY_NAMES` on, tapping the name edits it in place (dashed underline). With it off, the name is plain text.
   - A Work/Rest `Segmented` control. Switching to Rest with exercises in the day asks for confirmation, then clears them.
   - Exercise rows, each with a reorder handle, the name and a spec chip ("8–10 reps", shown with `PROGRAM_TARGETS` on). Tapping the chip opens a small sheet with rep min, rep max and starting sets steppers.
   - "+ Add exercise" opens the shared [Add exercise sheet](#add-exercise-sheet).
   - The hint "Tap a day name to rename it. Swipe a row to remove it." appears on the first day only.
   - Only one training day is expanded at a time. The others show "4 ex · 13 sets" and a chevron.
   - Rest days are compact rows on `surface.subtle`.
5. **Add day**: a dashed button at the bottom of the list.
6. **Save program**: a sticky white button over a blurred bar.

Reorder and swipe: use `react-native-gesture-handler` and `react-native-reanimated` if they're direct dependencies. They're in `node_modules` today but not in `package.json`. Ask the owner before adding them. The fallback is a long-press menu on each row with Move up, Move down and Remove.

Validation: a name is required, at least one training day, and every training day has at least one exercise.

Save: `plansService.createPlan` or `updatePlan`. The current payload is `{ name, days: [{ isRestDay, workoutExercises: [{ id, order }] }] }`. Add `name` per day and `repMin`, `repMax` and `startingSets` per exercise only when their flags are on. See [`04-backend.md`](04-backend.md).

### New program sheet

- **Board**: `NewProgramSheet.dc.html`
- **File**: `src/components/plan/NewProgramSheet.tsx`; replaces `AIPlanChatModal`

- **Title**: "New program".
- **Build it yourself**: "Add days and exercises by hand". It opens `EditPlan` with no `planId`.
- **Describe it**: "Get a draft, then edit it in the builder". Selecting it expands a multi-line field (placeholder: "4 days a week, upper/lower. Prioritise back and arms. Commercial gym, machines are fine.") and starter chips (Upper / Lower, Push / Pull / Legs, Full body 3×, Arm priority) that insert text.
- **Footer**: a white button, "Draft my program", which calls `createPlanWithAI(prompt)` and opens `EditPlan` with the returned `planId` and `draftFromAI: true`.

**Note:** the board's caption says nothing is saved until you tap Save. Today `create-with-ai` saves the plan when it returns. Until the [draft mode](04-backend.md#ai-draft-mode) ships, use the caption "The draft is saved as a program. Change anything before you start a cycle."

### Start a cycle sheet

- **Board**: `StartCycleSheet.dc.html`
- **File**: `src/components/plan/StartCycleSheet.tsx`

- **Title**: "Start a cycle", with subtitle "From PPL/Upper/Lower · 5 training days a week".
- **NAME**: prefilled "Meso N+1".
- **Weeks**: a stepper from 3 to 8, default 5, with the caption "Includes a deload as the last week".
- **HOW EFFORT RAMPS**: one cell per week, "W1 RIR 3" down to "W4 RIR 0", then "W5 Deload". It previews the ramp for the selected week count: RIR counts down from 3 to 0 across the training weeks (clamped at 0), and the last week is the deload. If the API assigns a different ramp, show the API's. See [RIR ramp](04-backend.md#rir-ramp).
- **Caption**: "Sets start at each exercise's week-1 count and rise from there."
- **Starts**: "Starts Monday, Sep 21", shown only with `CYCLE_START_OPTIONS` on.
- **Footer**: a white button, "Start cycle", which calls `mesocyclesService.createMesocycle({ name, planId, iterations })`, then returns to Today with the new cycle loaded.

### Mesocycle detail

- **Board**: `MesocycleDetail.dc.html`
- **File**: `src/screens/mesocycle/MesocycleDetailScreen.tsx` (rebuild)
- **Data**: `useCycleStats(mesocycleId)`

1. **Header**: `DetailHeader`, titled "Meso 3", with a "RUNNING" or "DONE" tag. The meta line is "PPL/Upper/Lower · started Aug 24 · 5 weeks".
2. **Progress**: "11 of 25 days logged" with "Week 2 of 5", and a thin progress bar.
3. **Stat tiles**: Adherence (87%) and Avg e1RM (+6.1%).
4. **WEEK BY WEEK**: one card per iteration with "Week 1", "RIR 3" and its tonnage ("16,974 so far" for the current week). Expanding a week lists its days with done, missed or upcoming state. A done day opens `PastSession`.
5. **Actions**: "Finish cycle early" (secondary, running cycles only) and "Delete" (danger text, confirms with the logged session count).

### Exercise detail

- **Board**: `ExerciseDetail.dc.html`
- **File**: `src/screens/exercise/ExerciseDetailScreen.tsx` (rebuild; replaces the Overview, Charts and History tabs)
- **Data**: `useExerciseProgress(exerciseId, 'all')`, `plansService.getPlans()`

1. **Header**: `DetailHeader` with "Edit" (opens the Edit exercise sheet). The title is the name, with a muscle `Tag` and "18 sessions · last 3 days ago".
2. **ESTIMATED 1RM**: the hero value, "+44 since March", and a `Segmented` control with 1RM and Vol that switches the chart between the e1RM series and session volume.
3. **Line chart**: as on Progress.
4. **Records**: the same 2×2 tiles as Progress.
5. **Every session**: an "All 18" link. Each session shows its date and sets as "130 × 12", with the top set highlighted (`data.main` text). The caption reads "Highlighted set is the one the est. 1RM comes from."
6. **USED IN 2 PROGRAMS**: rows "PPL/Upper/Lower · Day 1", with "4 × 8–12" on the right when `PROGRAM_TARGETS` is on.

Empty (never performed): hide the chart and records, and show "You haven't logged this yet."

### Edit exercise sheet

- **Board**: `EditExerciseSheet.dc.html`
- **File**: `src/components/exercise/EditExerciseSheet.tsx`; replaces `EditExerciseModal`

- **NAME**: a `TextField`.
- **MUSCLE GROUP**: single-select chips.
- **Impact line**: "Used in 2 programs and 18 logged sessions. A rename or new muscle group applies everywhere, including past sessions and charts."
- **Save changes**: a white button that calls `exercisesService` or `dashboardService.updateExercise`.
- **Delete exercise**: danger text that confirms with the counts. See the open decision in the [README](README.md#open-decisions).

---

## Sign in and account

### Sign in

- **Board**: `SignIn.dc.html`
- **File**: `src/screens/auth/SignInScreen.tsx` (restyle)

"MesoIQ" wordmark text, the title "Sign in", and the line "Train in blocks. See what's working." Below that, EMAIL and PASSWORD fields (with a Show toggle), a white "Sign in" button, and "New to MesoIQ? Create an account". Show errors inline under the fields in `danger.base`. Keep the auth logic as is.

### Sign up

- **Board**: `SignUp.dc.html`
- **File**: `src/screens/auth/SignUpScreen.tsx` (restyle)

The title "Create your account", with the line "One account for your programs, cycles and every set you log." It has EMAIL, PASSWORD ("At least 8 characters", with Show) and CONFIRM PASSWORD fields, a white "Create account" button, and "Already have an account? Sign in".

### Account

- **Board**: `Account.dc.html`
- **File**: `src/screens/main/AccountSettingsScreen.tsx` (restyle)

- **Profile**: the avatar initial, "Signed in", and the email.
- **DATA**: "Download my data", with meta "Every program, cycle and set, as a file". It uses the existing `userDataExportService`.
- **ACCOUNT**: "Sign out", then "Delete account" in `danger.base`, with meta "Removes all programs, cycles and logged sets". Delete account keeps its confirmation.
- **Footer**: "MesoIQ" and the app version, in `text.faint`.
