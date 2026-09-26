import { colors } from './tokens';

export const shadow = {
  primary: {
    shadowColor: colors.action.onFill,
    shadowOpacity: 0.45,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabBar: {
    shadowColor: colors.action.onFill,
    shadowOpacity: 0.62,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  tabItem: {
    shadowColor: colors.action.onFill,
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
} as const;
