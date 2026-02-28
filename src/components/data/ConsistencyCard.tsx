import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PlanInstanceDay } from '../../types/workout';
import { themeColors, spacing } from '../../theme/colors';
import { DataCard } from './DataCard';
import { useSchedule } from '../../context/ScheduleContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type ConsistencyCardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ConsistencyCardProps {
  mesocycleId: number | null;
}

export const ConsistencyCard: React.FC<ConsistencyCardProps> = ({ mesocycleId }) => {
  const navigation = useNavigation<ConsistencyCardNavigationProp>();
  const { schedule, loading, error } = useSchedule();

  const handlePress = () => {
    navigation.navigate('Heatmap', { mesocycleId });
  };

  // Process completed workouts and create map (same logic as WorkoutCalendar)
  const completedDatesMap = useMemo(() => {
    if (!schedule) return new Map<string, boolean>();

    const completedWorkoutInstances = schedule.workoutInstances.filter(
      instance => instance.completedAt !== null
    );

    const datesMap = new Map<string, boolean>();

    completedWorkoutInstances.forEach(instance => {
      if (!instance.completedAt) return;
      const completionDate = new Date(instance.completedAt);
      completionDate.setHours(0, 0, 0, 0);
      const dateKey = completionDate.toISOString().split('T')[0];
      datesMap.set(dateKey, true);
    });

    return datesMap;
  }, [schedule]);

  // Generate array of last 28 days from today backwards
  const last28Days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days: Array<{ date: Date; dateKey: string; isCompleted: boolean }> = [];
    
    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dateKey = date.toISOString().split('T')[0];
      const isCompleted = completedDatesMap.has(dateKey);
      
      days.push({ date, dateKey, isCompleted });
    }
    
    return days;
  }, [completedDatesMap]);

  // Group days into 4 rows of 7
  const rows = useMemo(() => {
    const rows: Array<Array<{ date: Date; dateKey: string; isCompleted: boolean }>> = [];
    for (let i = 0; i < 4; i++) {
      const startIdx = i * 7;
      rows.push(last28Days.slice(startIdx, startIdx + 7));
    }
    return rows;
  }, [last28Days]);

  // Show loading if schedule is being fetched
  if (loading) {
    return (
      <DataCard title="Consistency" onPress={handlePress}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={themeColors.primary.main} />
        </View>
      </DataCard>
    );
  }

  if (error) {
    return null; // Silently fail - don't show error
  }

  // Show card if we have schedule data (history), even without mesocycleId
  if (!schedule || !schedule.workoutInstances || schedule.workoutInstances.length === 0) {
    return null;
  }

  return (
    <DataCard title="Consistency" onPress={handlePress}>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((day) => (
              <View
                key={day.dateKey}
                style={[
                  styles.square,
                  day.isCompleted ? styles.squareCompleted : styles.squareEmpty,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </DataCard>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  square: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  squareCompleted: {
    backgroundColor: themeColors.accent.success,
  },
  squareEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

