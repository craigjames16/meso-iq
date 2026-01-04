// Theme colors matching the Next.js web app
export const themeColors = {
  // Primary colors
  primary: {
    main: 'rgb(45, 115, 212)',
    //color rgb(13, 47, 94)

    light: 'rgb(97, 162, 255)',
    dark: 'rgb(43, 57, 79)',
  },
  
  // Accent colors
  accent: {
    warning: '#ff7300',
    success: '#10b981',
    error: '#ef4444',
  },
  
  // Text colors
  text: {
    primary: 'rgba(255, 255, 255, 0.95)',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(156, 163, 175, 0.9)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Background colors
  background: {
    primary: '#1a1a1a',
    secondary: '#2a2a2a',
    surface: 'rgba(255, 255, 255, 0.05)',
    elevated: 'rgba(255, 255, 255, 0.08)',
  },
  
  // Border colors
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    light: 'rgba(255, 255, 255, 0.15)',
    focus: 'rgba(136, 132, 216, 0.5)',
  },
  
  // Overlay colors
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.15)',
  },
  
  // Chart specific colors
  chart: {
    volume: 'rgb(45, 115, 212)',
    sets: '#8884d8',
    gridLine: 'rgba(255, 255, 255, 0.2)',
    axisLabel: 'rgba(255, 255, 255, 0.85)',
  },
} as const;

// Chart constants
export const chartColors = {
  volume: themeColors.chart.volume,
  sets: themeColors.chart.sets,
  barOpacity: 0.6,
  lineWidth: 3,
  areaOpacity: 0.1,
} as const;

// Common style values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

