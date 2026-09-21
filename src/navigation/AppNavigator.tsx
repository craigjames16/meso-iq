import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator, type MainTabParamList } from './MainNavigator';
import { WorkoutDetailScreen } from '../screens/workout/WorkoutDetailScreen';
import { WorkoutCompleteScreen } from '../screens/workout/WorkoutCompleteScreen';
import { AccountSettingsScreen } from '../screens/main/AccountSettingsScreen';
import { PlanDetailScreen } from '../screens/plan/PlanDetailScreen';
import { EditPlanScreen } from '../screens/plan/EditPlanScreen';
import { MesocycleDetailScreen } from '../screens/mesocycle/MesocycleDetailScreen';
import { HeatmapScreen } from '../screens/main/HeatmapScreen';
import { ExerciseDetailScreen } from '../screens/exercise/ExerciseDetailScreen';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  WorkoutDetail: { workoutInstanceId: number };
  WorkoutComplete: { workoutInstanceId: number };
  AccountSettings: undefined;
  PlanDetail: { planId: number };
  EditPlan: { planId: number };
  MesocycleDetail: { mesocycleId: number };
  Heatmap: { mesocycleId: number | null };
  ExerciseDetail: { exerciseId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: '#1a1a1a' },
          }}
        >
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen 
            name="WorkoutDetail" 
            component={WorkoutDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Workout', // fallback until screen sets Week X - Day Y
            }}
          />
          <Stack.Screen
            name="WorkoutComplete"
            component={WorkoutCompleteScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen 
            name="AccountSettings" 
            component={AccountSettingsScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Account Settings',
            }}
          />
          <Stack.Screen 
            name="PlanDetail" 
            component={PlanDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Plan Details',
            }}
          />
          <Stack.Screen 
            name="EditPlan" 
            component={EditPlanScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Edit Plan',
            }}
          />
          <Stack.Screen 
            name="MesocycleDetail" 
            component={MesocycleDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Mesocycle Details',
            }}
          />
          <Stack.Screen 
            name="Heatmap" 
            component={HeatmapScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Workout Heatmap',
            }}
          />
          <Stack.Screen 
            name="ExerciseDetail" 
            component={ExerciseDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a1a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Exercise Details',
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
});


