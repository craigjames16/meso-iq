import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TrackScreen } from '../screens/main/TrackScreen';
import { DataScreen } from '../screens/main/DataScreen';
import { PlanScreen } from '../screens/main/PlanScreen';
import { GlassTabBar } from '../components/GlassTabBar';
import { colors } from '../theme';

export type DataSubTab = 'cycle' | 'progress' | 'history';

export type MainTabParamList = {
  Track: undefined;
  Data: { tab?: DataSubTab } | undefined;
  Plan: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabBar = (props: React.ComponentProps<typeof GlassTabBar>) => <GlassTabBar {...props} />;

export const MainNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={renderTabBar}
    screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: colors.bg },
    }}
  >
    <Tab.Screen name="Track" component={TrackScreen} options={{ title: 'Track' }} />
    <Tab.Screen name="Data" component={DataScreen} options={{ title: 'Data' }} />
    <Tab.Screen name="Plan" component={PlanScreen} options={{ title: 'Plan' }} />
  </Tab.Navigator>
);
