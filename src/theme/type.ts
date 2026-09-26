import type { TextStyle } from 'react-native';

// Text styles for the redesign. The canvas uses weight 650 in places;
// React Native uses '600' for those.

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/** The type scale in points. Components use these names, never raw sizes. */
export const size = {
  micro: 8.5,
  tiny: 9,
  tagSmall: 9.5,
  tag: 10,
  caption: 10.5,
  label: 11,
  metaSmall: 11.5,
  metaMid: 12,
  meta: 12.5,
  control: 13,
  strong: 13.5,
  body: 14,
  field: 14.5,
  input: 15,
  title: 16,
  sheet: 17,
  heading: 18,
  stat: 19,
  statLarge: 20,
  detail: 27,
  tab: 30,
  hero: 32,
  heroLarge: 34,
} as const;

export const type = {
  tabTitle: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  detailTitle: { fontSize: 27, fontWeight: '700', letterSpacing: -0.4 },
  heroTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.8, lineHeight: 34 },
  hero: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6, fontVariant: tabular },
  sheetTitle: { fontSize: 17, fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  bodyStrong: { fontSize: 13.5, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  meta: { fontSize: 12.5, fontWeight: '400' },
  metaSmall: { fontSize: 11.5, fontWeight: '400' },
  caption: { fontSize: 10.5, fontWeight: '400' },
  setField: { fontSize: 16, fontWeight: '600', fontVariant: tabular },
  stat: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, fontVariant: tabular },
  value: { fontSize: 13.5, fontWeight: '600', fontVariant: tabular },
  tag: { fontSize: 10, fontWeight: '700' },
  tagSmall: { fontSize: 9.5, fontWeight: '700' },
  button: { fontSize: 15, fontWeight: '600' },
  buttonSmall: { fontSize: 13, fontWeight: '600' },
  tabLabel: { fontSize: 10.5, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

export const tabularNums = { fontVariant: tabular } satisfies TextStyle;

// Widths shared by icons and glyphs drawn with react-native-svg.
export const iconSize = {
  sm: 15,
  md: 18,
  lg: 21,
  xl: 22,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
