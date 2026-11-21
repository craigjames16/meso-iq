// Design tokens for the MesoIQ redesign. This is the only file in the app
// that contains hex values; components import from `src/theme`.

export const colors = {
  bg: '#0B0B0D',
  scrim: '#060608', // behind sheets; dim the screen to 30% opacity
  surface: {
    card: '#141417',
    raised: '#17171B', // icon buttons, unselected chips
    inset: '#1A1A1F', // segmented container, list rows inside cards
    field: '#1C1C22', // inputs, set fields, badges
    subtle: '#101013', // rest days, secondary rows
    subtleAlt: '#111114',
  },
  border: {
    card: '#232329',
    raised: '#26262D',
    field: '#2A2A31',
    strong: '#34343C', // unchecked checkbox, sheet handle
    stronger: '#3A3A44',
    divider: '#1F1F25',
    dividerAlt: '#222228',
    track: '#1E1E23', // empty part of a bar
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
    fill: '#FAFAFA', // primary buttons, selected tab, chip, segment
    onFill: '#0B0B0D',
  },
  data: {
    main: '#FF6B35', // signal orange: every data series
    secondary: '#C25A2E',
    reference: '#6E6E7A', // ticks, trend lines, previous-period series (dashed)
    average: '#FAFAFA', // 3-month average line (dashed)
    heat: ['#1C1C22', '#3F2317', '#95462A', '#FF6B35'], // level 0..3
    matrix: ['#191920', '#3A2116', '#6B3420', '#B04A26', '#FF6B35'], // level 0..4
    onMatrixMax: '#0B0B0D', // text on the brightest matrix cell
  },
  success: {
    base: '#45C98A',
    rowBg: '#12291C', // completed set row
    fieldBg: '#173322',
    fieldBorder: '#2C6B4A',
    fieldText: '#C4F0D6',
    badgeBg: '#194430',
    badgeText: '#8FE3B4',
    lastText: '#5E9B7B', // the "Last" hints under a completed row
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

// Translucent values for the glass tab bar and overlays. They sit on top of
// other content, so they're defined as rgba rather than solid tokens.
export const glass = {
  fill: 'rgba(26,26,32,0.46)',
  rimStops: [
    { offset: 0, color: '#FFFFFF', opacity: 0.34 },
    { offset: 0.38, color: '#FFFFFF', opacity: 0.06 },
    { offset: 0.66, color: '#FFFFFF', opacity: 0.02 },
    { offset: 1, color: '#FFFFFF', opacity: 0.2 },
  ],
  chromeFill: 'rgba(11,11,13,0.86)', // pinned headers where the OS glass material isn't available
  sheen: 'rgba(255,255,255,0.11)',
  innerHighlight: 'rgba(255,255,255,0.14)',
  todayFill: 'rgba(250,250,250,0.10)',
  selectedFill: 'rgba(250,250,250,0.15)', // the tab bar's selection capsule
  selectedEdge: 'rgba(255,255,255,0.20)', // light catching its top edge
  scrimOpacity: 0.7,
} as const;

export const radius = {
  hairline: 1, // tick marks
  cell: 2, // heat cells, bar caps
  bar: 3, // bar fills
  tag: 4, // tags, pills
  badge: 5, // set badges, segmented inner item
  field: 6, // fields, chips, set rows, small buttons
  tile: 7, // stat tiles, inputs, segmented container
  card: 8, // cards, icon buttons, primary buttons
  sheet: 12, // sheet top corners
  tabItem: 23, // active tab capsule: half of the 46pt item height
  play: 14, // Track play button
  tabBar: 29, // glass tab bar: half of the 58pt bar height, concentric with the item
  round: 999, // avatars, dots
} as const;

export const space = {
  gutter: 5, // screen left and right padding
  screenTop: 12,
  screenBottom: 92, // clears the floating tab bar
  cardPad: 14, // 16 for hero cards
  heroPad: 16,
  cardGap: 6, // 7 between major sections
  sectionGap: 7,
  rowGap: 6, // between set rows and list rows
  sheetPadX: 14,
  sheetPadBottom: 24,
  hairline: 1,
} as const;

export type Colors = typeof colors;
export type TechniqueSetType = keyof typeof colors.technique;
