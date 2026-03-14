import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ScheduleProvider } from './src/context/ScheduleContext';
import { WorkoutInstanceProvider } from './src/context/WorkoutInstanceContext';
import { AppNavigator } from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <ScheduleProvider>
          <WorkoutInstanceProvider>
            <AppNavigator />
          </WorkoutInstanceProvider>
        </ScheduleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
