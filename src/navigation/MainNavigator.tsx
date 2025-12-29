import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TrackScreen } from '../screens/main/TrackScreen';
import { DataScreen } from '../screens/main/DataScreen';
import { PlanScreen } from '../screens/main/PlanScreen';
import type { RootStackParamList } from './AppNavigator';

export type MainTabParamList = {
  Track: undefined;
  Data: undefined;
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
      <MaterialIcons name="account-circle" size={28} color="#fff" />
    </TouchableOpacity>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => <AccountHeaderButton />,
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen 
        name="Track" 
        component={TrackScreen}
        options={{ 
          title: 'Track',
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
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

