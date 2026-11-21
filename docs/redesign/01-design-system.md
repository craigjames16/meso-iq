# Design system

This document defines the tokens, UI primitives and chart primitives for the redesign. Phase 1 builds all of it. Screen layouts live in [`03-screens.md`](03-screens.md).

## Colour tokens

Put these in `src/theme/tokens.ts` exactly as written. Components import `colors` and never write hex values.

```ts
export const colors = {
  bg: '#0B0B0D',
  scrim: '#060608',          // behind sheets; dim the screen to 30% opacity
  surface: {
    card: '#141417',
    raised: '#17171B',       // icon buttons, unselected chips
    inset: '#1A1A1F',        // segmented container, list rows inside cards
    field: '#1C1C22',        // inputs, set fields, badges
    subtle: '#101013',       // rest days, secondary rows
    subtleAlt: '#111114',
  },
  border: {
    card: '#232329',
    raised: '#26262D',
    field: '#2A2A31',
    strong: '#34343C',       // unchecked checkbox, sheet handle
    stronger: '#3A3A44',
    divider: '#1F1F25',
    dividerAlt: '#222228',
    track: '#1E1E23',        // empty part of a bar
  },
  text: {
    primary: '#F4F4F5',
    body: '#E4E4E7',
    secondary: '#A1A1AA',
    muted: '#8E8E98',
    faint: '#71717A',
    disabled: '#5A5A64',
  },
  action: {
    fill: '#FAFAFA',         // primary buttons, selected tab, chip, segment
    onFill: '#0B0B0D',
  },
  data: {
    main: '#FF6B35',         // signal orange: every data series
    secondary: '#C25A2E',
    reference: '#6E6E7A',    // ticks, trend lines, previous-period series (dashed)
    average: '#FAFAFA',      // 3-month average line (dashed)
    heat: ['#1C1C22', '#3F2317', '#95462A', '#FF6B35'],            // level 0..3
    matrix: ['#191920', '#3A2116', '#6B3420', '#B04A26', '#FF6B35'], // level 0..4
    onMatrixMax: '#0B0B0D',  // text on the brightest matrix cell
  },
  success: {
    base: '#45C98A',
    rowBg: '#12291C',        // completed set row
    fieldBg: '#173322',
    fieldBorder: '#2C6B4A',
    fieldText: '#C4F0D6',
    badgeBg: '#194430',
    badgeText: '#8FE3B4',
    lastText: '#5E9B7B',     // "Last 130 × 14" under a completed row
    pillBg: '#17321F',
    pillBorder: '#2A5436',
    pillText: '#6FD9A2',
  },
  warning: { base: '#F5C542', dim: '#C99A24', bg: '#17150E', border: '#3A3212' },
  danger: { base: '#E8706F', bg: '#2A1517', border: '#4A2226' },
  technique: {
    DROP_SET: { fg: '#F5C542', tagBg: '#2E2611', selectedBg: '#26200C', selectedBorder: '#6B5A16' },
    REST_PAUSE: { fg: '#A78BFA', tagBg: '#221C34', selectedBg: '#1D1830', selectedBorder: '#4B3D7A' },
    MYO_REP: { fg: '#2DD4BF', tagBg: '#10302C', selectedBg: '#0E2825', selectedBorder: '#1F6B61' },
  },
} as const;
```

**Note:** the `selectedBg` and `selectedBorder` values for rest-pause and myo-reps aren't on the canvas. They follow the drop-set pattern. Adjust them by eye if they read too strong.

### Colour rules

- **Primary action**: one white button per screen at most. Secondary actions use `surface.raised` with `text.body`.
- **Selection**: a selected tab, chip, segment or filter uses `action.fill` with `action.onFill` text.
- **Data**: bars, lines, dots and heat cells use `data.*`. Status colours never appear in charts, except the gold low-volume bar in the program volume profile.
- **Deltas**: positive deltas use `success.pillText`. Negative deltas use `danger.base`. Flat deltas (absolute value under 0.5%) use `text.muted`.
- **Status**: green means done or good, gold means attention, red means destructive or bad.

## Radius

```ts
export const radius = {
  cell: 2,      // heat cells, bar caps
  bar: 3,       // bar fills
  tag: 4,       // tags, pills
  badge: 5,     // set badges, segmented inner item
  field: 6,     // fields, chips, set rows, small buttons
  tile: 7,      // stat tiles, inputs, segmented container
  card: 8,      // cards, icon buttons, primary buttons
  sheet: 12,    // sheet top corners
  play: 14,     // Track play button
  tabItem: 23,  // tab bar selection capsule: half the 46pt item height
  tabBar: 29,   // glass tab bar: half the 58pt bar height, concentric with the item
  round: 999,   // avatars, dots
} as const;
```

## Spacing

```ts
export const space = {
  gutter: 5,           // screen left and right padding
  screenTop: 12,
  screenBottom: 92,    // clears the floating tab bar
  cardPad: 14,         // 16 for hero cards
  cardGap: 6,          // 7 between major sections
  rowGap: 6,           // between set rows and list rows
  sheetPadX: 14,
  sheetPadBottom: 24,
} as const;
```

Add the safe-area bottom inset to `screenBottom` on devices with a home indicator.

## Typography

Use the system font (SF Pro on iOS). Define these as text style objects in `src/theme/type.ts`.

| Token | Size / weight | Extra | Used for |
|---|---|---|---|
| `tabTitle` | 30 / 700 | letterSpacing -0.6 | Today, Data, Plan headers |
| `detailTitle` | 27 / 700 | letterSpacing -0.4 | Detail screen titles |
| `hero` | 32–34 / 700 | tabular | Hero numbers (e1RM, sets) |
| `sheetTitle` | 17 / 600 | | Sheet titles |
| `cardTitle` | 15 / 600 | | Card titles |
| `body` | 14 / 400 | | List row titles |
| `label` | 11 / 700 | uppercase, letterSpacing 1 | Section labels |
| `meta` | 11.5–12.5 / 400 | | Secondary lines |
| `setField` | 16 / 600 | tabular | Weight and reps fields |
| `tag` | 9.5–10 / 700 | | Set badges, tags |

## UI primitives

Build these in `src/components/ui/` and export them from `src/components/ui/index.ts`. Props below are the minimum. Add what the screens need.

- **`Screen`**: safe-area wrapper with a `ScrollView`, `bg` background and the screen padding. Props: `scroll?: boolean`, `refreshControl?`.
- **`ScreenHeader`**: the `LogoMark`, then the tab title (`tabTitle`), with an optional right accessory (avatar button, filter chip). Props: `title`, `subtitle?`, `right?`. Track, Data and Plan use it, so the mark appears once per tab and nowhere else in the app chrome.
- **`LogoMark`**: the MesoIQ mark — three bars in `data.main` stepping up, then a fourth in `data.reference`, higher again. Props: `size?` (18 in a header, 30 in the auth lockup). Brand only: it carries no state and never responds to a press. Pushed screens keep the back button in the top-left instead.
- **`DetailHeader`**: back chevron, optional right action text (for example "Edit"), then `detailTitle` and a meta line. Props: `title`, `meta?`, `onBack`, `action?: { label, onPress }`.
- **`Card`**: `surface.card` with a `border.card` border and `radius.card`. Props: `variant?: 'default' | 'subtle' | 'warning' | 'danger'`, `padding?: 14 | 16`.
- **`SectionLabel`**: uppercase label with an optional right link ("All 89"). Props: `children`, `action?: { label, onPress }`, `info?: ChartInfoId`.
- **`InfoButton`**: an ⓘ glyph that opens a `Sheet` explaining what a chart measures. Props: `id: ChartInfoId`. The copy lives in `src/components/ui/chartInfo.ts`, keyed by chart. `CardTitle` and `SectionLabel` take an `info` prop that renders one on the right, so most charts need no extra markup. Place it standalone only where a chart has neither.
- **`Button`**: Props: `variant: 'primary' | 'secondary' | 'ghost' | 'danger'`, `label`, `onPress`, `disabled?`, `loading?`, `full?`. Primary is `action.fill` with `action.onFill` text, `radius.card`, 15px vertical padding and the shadow `{ shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 6 }`. Put the shadow values in `src/theme/shadow.ts`.
- **`IconButton`**: 30–34pt square, `surface.raised`, `border.raised`, `radius.card`. Props: `icon`, `onPress`, `accessibilityLabel` (required).
- **`Chip`**: Props: `label`, `selected`, `onPress`. Unselected is `surface.raised` with `text.secondary`.
- **`Segmented`**: container `surface.inset` with `radius.tile` and 2px padding. Items use `radius.badge`. The selected item is white. Props: `options: { value, label }[]`, `value`, `onChange`. The Data and Plan sub-tabs use this.
- **`StatTile`**: label, value and optional delta. Props: `label`, `value`, `delta?: number`, `unit?`.
- **`ListRow`**: title, meta line, right value, optional delta and chevron. Props: `title`, `meta?`, `value?`, `delta?`, `onPress?`.
- **`DeltaText`**: formats a signed percentage with the delta colours. Props: `value: number`, `digits?: 1`.
- **`Tag`**: small rounded label. Props: `label`, `tone: 'neutral' | 'success' | 'warning' | 'danger' | 'drop' | 'restPause' | 'myo'`.
- **`Sheet`**: bottom sheet over a `scrim`. It has a 38×4 handle, `radius.sheet` top corners, a title, an optional subtitle and a close `IconButton`. Swipe down or tap the scrim to close. Replace `BottomDrawer.tsx` with it. Props: `visible`, `onClose`, `title`, `subtitle?`, `footer?`, `children`.
- **`TextField`**: `surface.card` fill, `border.field` border, `radius.tile` and 13×15 padding, with an uppercase label above. The focused border is 1.5px `action.fill`.
- **`EmptyState`**, **`ErrorState`** and **`Skeleton`**: one line of `text.secondary` copy plus an optional action. The skeleton is a `surface.inset` block with the same dimensions as the content it replaces.

## Glass tab bar

Restyle `src/components/GlassTabBar.tsx`. Keep its current `@callstack/liquid-glass` usage and its non-glass fallback.

- **Position**: absolute, `left: 10`, `right: 10`, `bottom: 14` plus the safe-area inset.
- **Shape**: a capsule. The bar is 58pt tall, so `radius.tabBar` (29) closes both ends. Items are 46pt tall inside a 6pt rail, which keeps `radius.tabItem` (23) concentric with the outer edge.
- **Rim**: a 1px gradient stroke drawn over the glass with `react-native-svg`, using `glass.rimStops`. It is brightest along the top edge, where light would strike the material, and it is what separates the bar from dark content behind it.
- **Fill**: the glass path supplies its own blur (target `blur(26) saturate(190%)`). On the fallback path, use `glass.fill`.
- **Items**: Track, Data and Plan, each with a 21pt glyph above a label.
- **Selection**: one capsule in `glass.selectedFill` with a hairline `glass.selectedEdge` top border, sized to a third of the rail. It slides to the tapped tab; it is not redrawn per item. The selected tab's glyph and label are `text.primary`, the rest `text.secondary`.

The selection is a *lighter* layer of glass rather than the solid white pill the board shows. Solid white at this size reads as a button sitting on the bar instead of the bar's own material responding, and it fights the blur underneath.

### Motion

One `Animated.Value` holds the selection's position as a fractional tab index. The capsule's `translateX` and every tab's brightness interpolate from it, so the highlight cannot drift away from the capsule. Both run on the native driver.

- **The travel is a spring, not a timing.** A spring re-targets from wherever the capsule currently is, so a tap mid-slide redirects it instead of restarting the journey. A fixed-duration animation cannot be interrupted this way.
- **Springs are written as a response and a damping ratio** — the two values Apple's designers work in — and converted in `src/theme/motion.ts`. The selection uses `spring(0.38, 0.9)`: quick, with just enough give to read as physical rather than mechanical.
- **Press feedback lands on touch-down**, not on release. The pressed tab springs to 0.9 scale with no overshoot and returns with a little bounce once the finger lifts.
- **Reduce Motion cuts the travel.** `useReducedMotion` in `src/hooks` watches the system setting; when it is on, the position is set directly and the capsule appears at the new tab without crossing the bar.

## Chart primitives

Build these in `src/components/charts/` with `react-native-svg`. They are presentational only: they take plain arrays and never fetch. Each takes a `width` from `onLayout`.

- **`BarRow`**: horizontal bar with a label on the left and a value and delta on the right. Props: `label`, `value`, `max`, `tick?: number` (a 2px `data.reference` mark, for example the 4-week average), `color?`. Track is `border.track`. Fill uses `radius.bar`.
- **`Sparkline`**: small line, no axes. Props: `values: number[]`, `color?`.
- **`LineChart`**: Props: `points: { x: Date; y: number; isPR?: boolean }[]`, `trend?: { slope, intercept }`, `yTicks?: number[]`, `xLabels?: { x: Date; label: string }[]`. It draws the series in `data.main` at 2px. The trend line is dashed `data.reference`. PR points get a 4.5px ring in `data.main` with a `bg` fill. Grid lines use `border.divider`.
- **`VerticalBars`**: monthly bars. Props: `bars: { label; value; partial?: boolean }[]`, `average?: number[]` (drawn as a white dashed line). A partial bar (the current month) gets a lighter fill and a "so far" label.
- **`HeatGrid`**: calendar grid of cells with `radius.cell`. Props: `weeks: { date: Date; level: 0 | 1 | 2 | 3 | null }[][]`, `onPressDay?`. `null` means a date outside the range. Cells use `data.heat[level]`.
- **`Matrix`**: weight rows × rep-bucket columns. Props: `rows: string[]`, `cols: string[]`, `cells: number[][]` (levels 0–4), `counts?: number[][]`. Cells use `data.matrix[level]`. Text on the brightest level uses `data.onMatrixMax`.
- **`Radar`**: 6 to 8 axes. Props: `axes: string[]`, `current: number[]`, `previous?: number[]`, both normalised to 0–1. Current is `data.main` at 2px with 18% fill. Previous is `data.reference`, dashed, no fill.
- **`ProfileBars`**: short vertical bars with three-letter muscle labels, used for the program volume profile. Props: `bars: { label; value; warn?: boolean }[]`. Warned bars use `warning.base`.

Every chart that shows a derived number carries an `InfoButton`. Its sheet names what the marks encode, how the number is computed and what the chart can't tell you. Keep each claim traceable to a function in `src/analytics`, and update the copy when the formula changes.

Label chart axes with `meta` in `text.faint`. Don't draw legends when a direct label works. The Progress line chart has a two-item inline key ("Trend", "Personal record") because the markers aren't labelled.

## Muscle labels

The API category is one of eight values. Use these labels everywhere.

| Category | Label | Short (bars, radar) |
|---|---|---|
| `BACK` | Back | BCK |
| `BICEPS` | Biceps | BIC |
| `CALVES` | Calves | CLF |
| `CHEST` | Chest | CHT |
| `HAMSTRINGS` | Hamstrings | HAM |
| `QUADS` | Quads | QDS |
| `SHOULDERS` | Shoulders | SHO |
| `TRICEPS` | Triceps | TRI |

Put this map in `src/theme/muscles.ts`.
