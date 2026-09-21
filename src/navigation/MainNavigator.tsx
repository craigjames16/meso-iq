import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TrackScreen } from '../screens/main/TrackScreen';
import { DataScreen } from '../screens/main/DataScreen';
import { 
  PlanScreen, 
  subscribeToPlanScreenState,
  handlePlanScreenCreateAction,
  getPlanScreenResourceName,
} from '../screens/main/PlanScreen';
import type { RootStackParamList } from './AppNavigator';
import { GlassTabBar } from '../components/GlassTabBar';
import { themeColors, spacing } from '../theme/colors';
import { colors } from '../theme';

export type DataSubTab = 'cycle' | 'progress' | 'history';

export type MainTabParamList = {
  Track: undefined;
  Data: { tab?: DataSubTab } | undefined;
  Plan: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type MainNavigatorNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const AccountHeaderButton: React.FC = () => {
  const navigation = useNavigation<MainNavigatorNavigationProp>();
  
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('AccountSettings')}
      style={{ marginRight: 16 }}
    >
      <MaterialIcons name="account-circle" size={28} color={colors.text.primary} />
    </TouchableOpacity>
  );
};

const CreateHeaderButton: React.FC = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToPlanScreenState(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const resourceName = getPlanScreenResourceName();

  return (
    <TouchableOpacity
      onPress={handlePlanScreenCreateAction}
      activeOpacity={0.8}
      style={{ 
        marginRight: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeColors.primary.main,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        gap: 6,
      }}
    >
      <MaterialIcons name="add" size={20} color={colors.text.primary} />
      <Text style={{ color: colors.text.primary, fontSize: 15, fontWeight: '600' }}>
        {resourceName}
      </Text>
    </TouchableOpacity>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => <AccountHeaderButton />,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border.card },
        tabBarActiveTintColor: colors.action.fill,
        tabBarInactiveTintColor: colors.text.secondary,
      }}
    >
      <Tab.Screen 
        name="Track" 
        component={TrackScreen}
        options={{ 
          title: 'Track',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="fitness-center" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Data" 
        component={DataScreen}
        options={{ 
          title: 'Data',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Plan" 
        component={PlanScreen}
        options={{ 
          title: 'Plan',
          headerRight: () => <CreateHeaderButton />,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};


