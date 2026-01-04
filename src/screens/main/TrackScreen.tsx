import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { workoutService } from '../../services/workoutService';
import { CurrentMesocycle, PlanInstanceDay } from '../../types/workout';
import { useNavigation } from '@react-navigation/native';
import { WorkoutHeatmap } from '../../components/WorkoutHeatmap';
import { WorkoutCalendar } from '../../components/WorkoutCalendar';
import { themeColors } from '../../theme/colors';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../navigation/MainNavigator';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type TrackScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Track'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Next Workout Component
const NextWorkout: React.FC<{
  currentMesocycle: CurrentMesocycle | null;
  onStartWorkout: (workoutInstanceId: number) => void;
  isStartingWorkout: boolean;
}> = ({ currentMesocycle, onStartWorkout, isStartingWorkout }) => {
  const [nextWorkout, setNextWorkout] = useState<PlanInstanceDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNextWorkout = async () => {
      if (!currentMesocycle) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('Fetching schedule for mesocycle:', currentMesocycle.id);
        const data = await workoutService.getSchedule(currentMesocycle.id);
        console.log('Schedule data received:', JSON.stringify(data.upcomingDays, null, 2));
        
        // Get the first upcoming day
        const firstUpcomingDay = data.upcomingDays.length > 0 ? data.upcomingDays[0] : null;
        setNextWorkout(firstUpcomingDay);
      } catch (err) {
        console.error('Error fetching schedule:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        console.error('Error details:', {
          message: errorMessage,
          error: err,
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNextWorkout();
  }, [currentMesocycle]);

  const handleStartWorkout = async () => {
    if (!nextWorkout) return;

    // Check if we need to create a new iteration (day has placeholder id)
    if (nextWorkout.id === -1 || nextWorkout.planInstanceId === -1) {
      // Create a new iteration first
      try {
        const iterationNumber = nextWorkout.planInstance?.iterationNumber || 1;
        const newIteration = await workoutService.createPlanInstance(
          currentMesocycle?.plan.id || 0,
          currentMesocycle?.id,
          typeof iterationNumber === 'number' ? iterationNumber : undefined
        );
        
        // Get the first day from the new iteration that matches the planDayId
        const firstDay = newIteration.days.find((d: any) => d.planDayId === nextWorkout.planDayId) || newIteration.days[0];
        
        // Check if it's a rest day - if so, complete it instead of starting a workout
        if (firstDay.planDay.isRestDay || !firstDay.planDay.workout) {
          // Complete the rest day
          await workoutService.completeRestDay(newIteration.id, firstDay.id);
          
          // Reload by refetching
          const data = await workoutService.getSchedule(currentMesocycle?.id || 0);
          const firstUpcomingDay = data.upcomingDays.length > 0 ? data.upcomingDays[0] : null;
          setNextWorkout(firstUpcomingDay);
        } else {
          // Start the workout with the new iteration's first day
          const workoutInstance = await workoutService.startWorkout(newIteration.id, firstDay.id);
          onStartWorkout(workoutInstance.id);
        }
      } catch (err) {
        console.error('Error creating new iteration:', err);
        setError(err instanceof Error ? err.message : 'Failed to create new iteration');
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create new iteration');
      }
    } else {
      // Start workout with existing iteration
      if (!nextWorkout.planInstanceId || !nextWorkout.id) {
        setError('Missing required workout information. Please try refreshing the page.');
        Alert.alert('Error', 'Missing required workout information. Please try refreshing the page.');
        return;
      }
      
      // Check if it's a rest day
      if (nextWorkout.planDay?.isRestDay) {
        try {
          await workoutService.completeRestDay(nextWorkout.planInstanceId, nextWorkout.id);
          
          // Reload by refetching
          const data = await workoutService.getSchedule(currentMesocycle?.id || 0);
          const firstUpcomingDay = data.upcomingDays.length > 0 ? data.upcomingDays[0] : null;
          setNextWorkout(firstUpcomingDay);
        } catch (err) {
          console.error('Error completing rest day:', err);
          setError(err instanceof Error ? err.message : 'Failed to complete rest day');
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete rest day');
        }
      } else {
        try {
          const workoutInstance = await workoutService.startWorkout(
            nextWorkout.planInstanceId, 
            nextWorkout.id
          );
          onStartWorkout(workoutInstance.id);
        } catch (err) {
          console.error('Error starting workout:', err);
          setError(err instanceof Error ? err.message : 'Failed to start workout');
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start workout');
        }
      }
    }
  };
  
  if (loading) {
    return (
      <View style={styles.nextWorkoutHeader}>
        <View style={styles.nextWorkoutContent}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.nextWorkoutHeader}>
        <View style={styles.nextWorkoutContent}>
          <Text style={styles.errorText}>
            Error loading next workout: {error}
          </Text>
        </View>
      </View>
    );
  }
  
  if (!nextWorkout || !nextWorkout.planDay) {
    return (
      <View style={styles.nextWorkoutHeader}>
        <View style={styles.nextWorkoutContent}>
          <Text style={styles.cardText}>
            No upcoming workouts found. Please check your mesocycle configuration.
          </Text>
        </View>
      </View>
    );
  }
  
  const isRestDay = nextWorkout.planDay?.isRestDay || false;
  const iterationNumber = nextWorkout.planInstance?.iterationNumber || 'Next';
  const dayNumber = nextWorkout.planDay?.dayNumber || '?';
  const hasWorkoutInstance = !!nextWorkout.workoutInstance;
  const isWorkoutInProgress = hasWorkoutInstance && !nextWorkout.workoutInstance?.completedAt;
  
  // Format title as "Week X - Day X"
  const titleText = typeof iterationNumber === 'number' 
    ? `Week ${iterationNumber} - Day ${dayNumber}`
    : `Day ${dayNumber}`;
  
  const planName = currentMesocycle?.plan?.name || '';

  return (
    <View style={styles.nextWorkoutHeader}>
      <View style={styles.nextWorkoutContent}>
        {isRestDay ? (
          <View style={[
            styles.avatar,
            { backgroundColor: '#2196F3' }
          ]}>
            <Text style={styles.avatarText}>
              {dayNumber}
            </Text>
          </View>
        ) : (
          <MaterialIcons name="fitness-center" size={24} color={themeColors.primary.main} />
        )}
        <View style={styles.nextWorkoutInfo}>
          <Text style={styles.nextWorkoutTitle}>
            {titleText}
          </Text>
          {planName ? (
            <Text style={styles.nextWorkoutSubtitle}>
              {planName}
            </Text>
          ) : null}
        </View>
        
        <TouchableOpacity
          style={[
            styles.playButton,
            isRestDay ? styles.restButton : styles.workoutButton,
            isStartingWorkout && styles.buttonDisabled
          ]}
          onPress={handleStartWorkout}
          disabled={isStartingWorkout}
        >
          <MaterialIcons 
            name={isRestDay ? "check" : "play-arrow"} 
            size={20} 
            color={"#fff"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TrackScreen: React.FC = () => {
  const navigation = useNavigation<TrackScreenNavigationProp>();
  const [currentMesocycle, setCurrentMesocycle] = useState<CurrentMesocycle | null>(null);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentMesocycle = async () => {
      try {
        console.log('Fetching mesocycles...');
        const data = await workoutService.getMesocycles();
        console.log('Mesocycles received:', JSON.stringify(data, null, 2));
        console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
        
        // Validate that data is an array
        if (!data) {
          console.warn('No data received from API');
          setError('No mesocycles data received');
          return;
        }
        
        if (!Array.isArray(data)) {
          console.error('Expected array but got:', typeof data, data);
          setError('Invalid response format: expected array');
          return;
        }
        
        // Find the mesocycle in progress
        const inProgress = data.find((m) => m.status === 'IN_PROGRESS');
        const selectedMesocycle = inProgress || (data.length > 0 ? data[0] : null);
        
        if (selectedMesocycle) {
          console.log('Selected mesocycle:', selectedMesocycle);
          setCurrentMesocycle(selectedMesocycle);
        } else {
          console.log('No mesocycle found');
        }
      } catch (err) {
        console.error('Error fetching mesocycles:', err);
        let errorMessage = 'Failed to fetch mesocycles';
        
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null) {
          errorMessage = (err as any).message || JSON.stringify(err);
        }
        
        console.error('Error details:', {
          message: errorMessage,
          error: err,
          errorType: typeof err,
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentMesocycle();
  }, []);

  const startWorkoutInstance = async (workoutInstanceId: number) => {
    try {
      setIsStartingWorkout(true);
      // Navigate to workout detail screen
      navigation.navigate('WorkoutDetail', { workoutInstanceId });
    } catch (error) {
      console.error('Error starting workout instance:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to start workout instance'
      );
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start workout instance');
    } finally {
      setIsStartingWorkout(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NextWorkout 
        currentMesocycle={currentMesocycle} 
        onStartWorkout={startWorkoutInstance}
        isStartingWorkout={isStartingWorkout}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <WorkoutCalendar mesocycleId={currentMesocycle?.id || null} />
        <WorkoutHeatmap mesocycleId={currentMesocycle?.id || null} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
  },
  nextWorkoutHeader: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  nextWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextWorkoutInfo: {
    flex: 1,
  },
  nextWorkoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  nextWorkoutSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutButton: {
    backgroundColor: themeColors.primary.main,
  },
  restButton: {
    backgroundColor: '#2196F3',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
