import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Try to import LiquidGlassView with fallback
let LiquidGlassView: React.ComponentType<any> | null = null;
let isLiquidGlassSupported = false;

try {
  const liquidGlassModule = require('@callstack/liquid-glass');
  LiquidGlassView = liquidGlassModule.LiquidGlassView;
  isLiquidGlassSupported = liquidGlassModule.isLiquidGlassSupported ?? false;
} catch (error) {
  // Module not available or not linked
  console.warn('LiquidGlass module not available, using fallback:', error);
}

export const GlassTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const tabBarContent = (
    <View style={styles.tabBarContent}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconName = getIconName(route.name);
        const color = isFocused ? '#fff' : '#666';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            <MaterialIcons
              name={iconName}
              size={24}
              color={color}
              style={styles.icon}
            />
            <Text
              style={[
                styles.label,
                { color },
                isFocused && styles.labelFocused,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const tabBarStyle = [
    styles.tabBar,
    {
      marginBottom: Math.max(insets.bottom, 0),
    },
  ];

  // Use LiquidGlassView if available and supported, otherwise use regular View with blur effect
  if (LiquidGlassView && isLiquidGlassSupported) {
    return (
      <LiquidGlassView style={tabBarStyle} effect="regular">
        {tabBarContent}
      </LiquidGlassView>
    );
  }

  // Fallback: Use regular View with semi-transparent background and blur-like styling
  return (
    <View style={[tabBarStyle, styles.fallbackTabBar]}>
      {tabBarContent}
    </View>
  );
};

const getIconName = (routeName: string): string => {
  switch (routeName) {
    case 'Track':
      return 'fitness-center';
    case 'Data':
      return 'bar-chart';
    case 'Plan':
      return 'calendar-today';
    default:
      return 'circle';
  }
};

const styles = StyleSheet.create({
  tabBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    position: 'absolute',
    bottom: 10,
    left: 0,
    width: "92%",
    zIndex: 99,
    borderRadius: 9999, // 100% border radius for pill shape
    // overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  fallbackTabBar: {
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'red',
  },
  tabBarContent: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  labelFocused: {
    fontWeight: '600',
    color: '#fff',
  },
});

