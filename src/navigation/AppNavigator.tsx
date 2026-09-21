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
import { PastSessionScreen } from '../screens/workout/PastSessionScreen';
import { AccountSettingsScreen } from '../screens/main/AccountSettingsScreen';
import { PlanDetailScreen } from '../screens/plan/PlanDetailScreen';
import { EditPlanScreen } from '../screens/plan/EditPlanScreen';
import { MesocycleDetailScreen } from '../screens/mesocycle/MesocycleDetailScreen';
import { HeatmapScreen } from '../screens/main/HeatmapScreen';
import { ExerciseDetailScreen } from '../screens/exercise/ExerciseDetailScreen';
import { StyleGuideScreen } from '../screens/dev/StyleGuideScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  WorkoutDetail: { workoutInstanceId: number };
  WorkoutComplete: { workoutInstanceId: number };
  PastSession: { workoutInstanceId: number };
  AccountSettings: undefined;
  PlanDetail: { planId: number };
  EditPlan: { planId: number };
  MesocycleDetail: { mesocycleId: number };
  Heatmap: { year: number };
  ExerciseDetail: { exerciseId: number };
  StyleGuide: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.primary} />
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
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen
            name="WorkoutComplete"
            component={WorkoutCompleteScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="PastSession" component={PastSessionScreen} />
          <Stack.Screen 
            name="AccountSettings" 
            component={AccountSettingsScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text.primary,
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Account Settings',
            }}
          />
          <Stack.Screen 
            name="PlanDetail" 
            component={PlanDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text.primary,
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Plan Details',
            }}
          />
          <Stack.Screen 
            name="EditPlan" 
            component={EditPlanScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text.primary,
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Edit Plan',
            }}
          />
          <Stack.Screen 
            name="MesocycleDetail" 
            component={MesocycleDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text.primary,
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Mesocycle Details',
            }}
          />
<Stack.Screen name="Heatmap" component={HeatmapScreen} />
          <Stack.Screen 
            name="ExerciseDetail" 
            component={ExerciseDetailScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text.primary,
              headerTitleStyle: { fontWeight: 'bold' },
              title: 'Exercise Details',
            }}
          />
          {__DEV__ ? <Stack.Screen name="StyleGuide" component={StyleGuideScreen} /> : null}
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
    backgroundColor: colors.bg,
  },
});


