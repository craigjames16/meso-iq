// Legacy theme alias. Screens that haven't been rebuilt still import
// `themeColors`, `spacing` and `borderRadius` from here. Each key maps onto the
// new tokens in `./tokens`, so the old screens pick up the new palette.
// Phase 8 deletes this file.
import { colors, radius } from './tokens';

export const themeColors = {
  primary: {
    // Old screens pair primary.main with white text, so it maps to signal
    // orange rather than action.fill to stay legible.
    main: colors.data.main,
    light: colors.data.main,
    dark: colors.data.secondary,
  },
  accent: {
    warning: colors.warning.base,
    success: colors.success.base,
    error: colors.danger.base,
  },
  text: {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.muted,
    disabled: colors.text.disabled,
  },
  background: {
    primary: colors.bg,
    secondary: colors.surface.card,
    surface: colors.surface.card,
    elevated: colors.surface.raised,
  },
  border: {
    default: colors.border.card,
    light: colors.border.field,
    focus: colors.action.fill,
  },
  overlay: {
    light: colors.surface.raised,
    medium: colors.surface.inset,
    strong: colors.surface.field,
  },
  chart: {
    volume: colors.data.main,
    sets: colors.data.secondary,
    gridLine: colors.border.divider,
    axisLabel: colors.text.faint,
  },
} as const;

export const chartColors = {
  volume: themeColors.chart.volume,
  sets: themeColors.chart.sets,
  barOpacity: 0.6,
  lineWidth: 3,
  areaOpacity: 0.1,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: radius.tag,
  md: radius.card,
  lg: radius.sheet,
  xl: radius.tabBar,
} as const;
