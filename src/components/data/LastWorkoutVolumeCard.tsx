import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { workoutService } from '../../services/workoutService';
import { themeColors, spacing } from '../../theme/colors';
import { DataCard } from './DataCard';
import { useSchedule } from '../../context/ScheduleContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type LastWorkoutVolumeCardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LastWorkoutVolumeCardProps {
  mesocycleId: number | null;
}

export const LastWorkoutVolumeCard: React.FC<LastWorkoutVolumeCardProps> = ({ mesocycleId }) => {
  const navigation = useNavigation<LastWorkoutVolumeCardNavigationProp>();
  const { schedule } = useSchedule();
  const [totalVolume, setTotalVolume] = useState<number | null>(null);
  const [workoutInstanceId, setWorkoutInstanceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePress = () => {
    if (workoutInstanceId) {
      navigation.navigate('WorkoutDetail', { workoutInstanceId });
    }
  };

  useEffect(() => {
    const fetchLastWorkoutVolume = async () => {
      // Show card if we have schedule data (history), even without mesocycleId
      if (!schedule || !schedule.workoutInstances || schedule.workoutInstances.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Find the last completed workout
        const completedWorkouts = schedule.workoutInstances.filter(
          instance => instance.completedAt !== null
        );

        if (completedWorkouts.length === 0) {
          setLoading(false);
          return;
        }

        // Get the most recent completed workout
        const lastWorkout = completedWorkouts.sort((a, b) => {
          const dateA = a.completedAt 
            ? new Date(a.completedAt).getTime()
            : 0;
          const dateB = b.completedAt
            ? new Date(b.completedAt).getTime()
            : 0;
          return dateB - dateA;
        })[0];

        if (!lastWorkout.id) {
          setLoading(false);
          return;
        }

        // Store the workout instance ID for navigation
        setWorkoutInstanceId(lastWorkout.id);

        // Calculate total volume from exercise sets if available, otherwise fetch details
        if (lastWorkout.exerciseSets && lastWorkout.exerciseSets.length > 0) {
          const volume = lastWorkout.exerciseSets.reduce(
            (total: number, set: any) => total + (set.weight * set.reps),
            0
          );
          setTotalVolume(volume);
          setLoading(false);
        } else {
          // Fetch the workout instance details to get exercise sets
          const workoutInstance = await workoutService.getWorkoutInstance(
            lastWorkout.id
          );

          // Calculate total volume: sum of (weight * reps) for all sets
          const volume = (workoutInstance.exerciseSets || []).reduce(
            (total: number, set: any) => total + (set.weight * set.reps),
            0
          );

          setTotalVolume(volume);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching last workout volume:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch last workout volume');
        setLoading(false);
      }
    };

    fetchLastWorkoutVolume();
  }, [mesocycleId, schedule]);

  if (loading) {
    return (
      <DataCard title="Last Workout Volume" onPress={workoutInstanceId ? handlePress : undefined}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={themeColors.primary.main} />
        </View>
      </DataCard>
    );
  }

  if (error) {
    return null; // Silently fail - don't show error
  }

  if (totalVolume === null) {
    return (
      <DataCard title="Last Workout Volume">
        <Text style={styles.emptyText}>No completed workouts</Text>
      </DataCard>
    );
  }

  return (
    <DataCard title="Last Workout Volume" onPress={handlePress}>
      <Text style={styles.volumeText}>
        {Math.round(totalVolume).toLocaleString()}
      </Text>
      <Text style={styles.volumeLabel}>lbs</Text>
    </DataCard>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  volumeText: {
    color: themeColors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  volumeLabel: {
    color: themeColors.text.secondary,
    fontSize: 14,
  },
});

