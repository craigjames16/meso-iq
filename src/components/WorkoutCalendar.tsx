import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Popover from 'react-native-popover-view';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { workoutService } from '../services/workoutService';
import { ScheduleData, PlanInstanceDay } from '../types/workout';
import { themeColors, spacing, borderRadius } from '../theme/colors';

interface WorkoutCalendarProps {
  mesocycleId: number | null;
}

type WorkoutCalendarNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const WorkoutCalendar: React.FC<WorkoutCalendarProps> = ({ mesocycleId }) => {
  const navigation = useNavigation<WorkoutCalendarNavigationProp>();
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; day: PlanInstanceDay | null } | null>(null);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
  const calendarWrapperRef = useRef<View>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!mesocycleId) {
        setLoading(false);
        return;
      }

      try {
        const data = await workoutService.getSchedule(mesocycleId);
        setSchedule(data);
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [mesocycleId]);

  // Process completed workouts and create map
  const { completedDates, completedDatesMap } = useMemo(() => {
    if (!schedule) return { completedDates: [], completedDatesMap: new Map<string, PlanInstanceDay>() };

    const completedWorkoutDays = schedule.previousDays.filter(
      day => !day.planDay.isRestDay && day.workoutInstance?.completedAt
    );

    const dates: Date[] = [];
    const datesMap = new Map<string, PlanInstanceDay>();

    completedWorkoutDays.forEach(day => {
      const completionDate = day.workoutInstance?.completedAt
        ? new Date(day.workoutInstance.completedAt)
        : new Date(day.updatedAt);
      completionDate.setHours(0, 0, 0, 0);
      dates.push(completionDate);
      const dateKey = completionDate.toISOString().split('T')[0];
      datesMap.set(dateKey, day);
    });

    return { completedDates: dates, completedDatesMap: datesMap };
  }, [schedule]);

  // Map upcoming workouts sequentially from today
  const { upcomingDates, upcomingDatesMap } = useMemo(() => {
    if (!schedule) return { upcomingDates: [], upcomingDatesMap: new Map<string, PlanInstanceDay>() };

    const upcomingDates: Date[] = [];
    const upcomingDatesMap = new Map<string, PlanInstanceDay>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let upcomingIndex = 0;
    const maxDays = 60; // Look ahead 60 days

    for (let i = 0; i < maxDays && upcomingIndex < schedule.upcomingDays.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      checkDate.setHours(0, 0, 0, 0);

      // Skip if this date already has a completed workout
      const isCompleted = completedDates.some(
        completedDate => completedDate.getTime() === checkDate.getTime()
      );

      if (!isCompleted && upcomingIndex < schedule.upcomingDays.length) {
        const upcomingDay = schedule.upcomingDays[upcomingIndex];
        const dateKey = checkDate.toISOString().split('T')[0];

        // Only add to upcomingDates if it's a workout day (for visual display)
        if (!upcomingDay.planDay.isRestDay) {
          upcomingDates.push(new Date(checkDate));
        }

        // Always add to map for tap handling (includes rest days)
        upcomingDatesMap.set(dateKey, upcomingDay);
        upcomingIndex++;
      }
    }

    return { upcomingDates, upcomingDatesMap };
  }, [schedule, completedDates]);

  // Create markedDates object for react-native-calendars
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    // Add completed workout dates
    completedDates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      marked[dateKey] = {
        marked: true,
        dotColor: themeColors.accent.success, // green
        selected: false,
      };
    });

    // Add upcoming workout dates
    upcomingDates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      marked[dateKey] = {
        marked: true,
        dotColor: themeColors.primary.main, // blue
        selected: false,
      };
    });

    // Mark today (preserve existing markings if any)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    if (marked[todayKey]) {
      // Preserve existing dot marking and add selected state
      marked[todayKey].selected = true;
      marked[todayKey].selectedColor = themeColors.primary.main;
    } else {
      // No existing marking, just mark as selected
      marked[todayKey] = {
        selected: true,
        selectedColor: themeColors.primary.main,
      };
    }

    return marked;
  }, [completedDates, upcomingDates]);

  // Custom theme for dark mode native calendar
  const calendarTheme = {
    backgroundColor: themeColors.background.primary,
    calendarBackground: themeColors.background.primary,
    textSectionTitleColor: themeColors.text.primary,
    selectedDayBackgroundColor: themeColors.primary.main,
    selectedDayTextColor: '#ffffff',
    todayTextColor: themeColors.primary.main,
    dayTextColor: themeColors.text.primary,
    textDisabledColor: themeColors.text.disabled,
    dotColor: themeColors.primary.main,
    selectedDotColor: '#ffffff',
    arrowColor: themeColors.primary.main,
    monthTextColor: themeColors.text.primary,
    indicatorColor: themeColors.primary.main,
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 13,
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
        </View>
      </View>
    );
  }

  if (error) {
    return null; // Silently fail - don't show error in calendar
  }

  if (!schedule) {
    return null;
  }

  const handleTouchStart = (event: any) => {
    // Capture touch coordinates immediately
    const { pageX, pageY } = event.nativeEvent;
    lastTouchRef.current = { x: pageX, y: pageY };
  };

  const handleDayPress = (day: { dateString: string }) => {
    const dateKey = day.dateString;
    
    // Use the last captured touch coordinates
    if (lastTouchRef.current) {
      setTouchPosition(lastTouchRef.current);
    }
    
    // Check if it's a completed workout
    const completedDay = completedDatesMap.get(dateKey);
    if (completedDay) {
      setSelectedDay({ date: dateKey, day: completedDay });
      return;
    }

    // Check if it's an upcoming workout
    const upcomingDay = upcomingDatesMap.get(dateKey);
    if (upcomingDay) {
      setSelectedDay({ date: dateKey, day: upcomingDay });
      return;
    }
  };

  const handleStartWorkout = async () => {
    if (!selectedDay || !selectedDay.day || isStartingWorkout) return;

    const day = selectedDay.day;
    setIsStartingWorkout(true);

    try {
      // Check if workout already exists
      if (day.workoutInstance?.id) {
        // Navigate to existing workout
        setSelectedDay(null);
        setTouchPosition(null);
        navigation.navigate('WorkoutDetail', { workoutInstanceId: day.workoutInstance.id });
        return;
      }

      // Check if it's a rest day
      if (day.planDay?.isRestDay) {
        if (day.planInstanceId && day.id) {
          await workoutService.completeRestDay(day.planInstanceId, day.id);
          // Refresh schedule
          if (mesocycleId) {
            const data = await workoutService.getSchedule(mesocycleId);
            setSchedule(data);
          }
        }
        setSelectedDay(null);
        setTouchPosition(null);
        return;
      }

      // Start new workout
      if (!day.planInstanceId || !day.id) {
        Alert.alert('Error', 'Missing required workout information');
        setSelectedDay(null);
        setTouchPosition(null);
        return;
      }

      const workoutInstance = await workoutService.startWorkout(day.planInstanceId, day.id);
      setSelectedDay(null);
      setTouchPosition(null);
      navigation.navigate('WorkoutDetail', { workoutInstanceId: workoutInstance.id });
    } catch (err) {
      console.error('Error starting workout:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start workout');
    } finally {
      setIsStartingWorkout(false);
    }
  };

  const getWorkoutName = (day: PlanInstanceDay | null): string => {
    if (!day) return '';
    
    if (day.planDay?.isRestDay) {
      return 'Rest Day';
    }
    
    if (day.workoutInstance?.workout?.name) {
      return day.workoutInstance.workout.name;
    }
    
    if (day.planDay?.workout?.name) {
      return day.planDay.workout.name;
    }
    
    return 'Workout';
  };

  const isCompleted = selectedDay?.day?.workoutInstance?.completedAt;
  const isRestDay = selectedDay?.day?.planDay?.isRestDay;

  return (
    <View style={styles.container}>
      <View 
        ref={calendarWrapperRef} 
        collapsable={false} 
        style={styles.calendarWrapper}
        onTouchStart={handleTouchStart}
        onStartShouldSetResponder={() => false}
      >
        <Calendar
          current={new Date().toISOString().split('T')[0]}
          markedDates={markedDates}
          theme={calendarTheme}
          markingType="dot"
          enableSwipeMonths={true}
          style={styles.calendar}
          onDayPress={handleDayPress}
        />
      </View>
      
      {selectedDay !== null && touchPosition && (
        <Popover
          isVisible={true}
          onRequestClose={() => {
            setSelectedDay(null);
            setTouchPosition(null);
          }}
          from={{ x: touchPosition.x, y: touchPosition.y } as any}
          popoverStyle={styles.tooltipContainer}
        >
        <View style={styles.tooltipContent}>
          <Text style={styles.tooltipTitle}>{getWorkoutName(selectedDay?.day || null)}</Text>
          {selectedDay?.day && (
            <Text style={styles.tooltipSubtitle}>
              {isRestDay 
                ? 'Tap to complete rest day'
                : isCompleted
                ? 'Tap to view workout'
                : 'Tap to start workout'}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.tooltipButton, isStartingWorkout && styles.tooltipButtonDisabled]}
            onPress={handleStartWorkout}
            disabled={isStartingWorkout}
          >
            {isStartingWorkout ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.tooltipButtonText}>
                {isRestDay ? 'Complete Rest Day' : isCompleted ? 'View Workout' : 'Start Workout'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        </Popover>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  calendarWrapper: {
    width: '100%',
  },
  calendar: {
    borderRadius: borderRadius.sm,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    backgroundColor: themeColors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minWidth: 200,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  tooltipSubtitle: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  tooltipButton: {
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tooltipButtonDisabled: {
    opacity: 0.6,
  },
  tooltipButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

