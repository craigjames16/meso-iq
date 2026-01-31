import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PlanInstanceDay } from '../types/workout';
import { themeColors, spacing, borderRadius } from '../theme/colors';
import { useSchedule } from '../context/ScheduleContext';

interface WeekViewCardsProps {
  mesocycleId: number | null;
}

type DayStatus = 'completed' | 'upcoming' | 'rest' | 'none';

interface DayCardData {
  date: Date;
  dayName: string;
  dayNumber: number;
  status: DayStatus;
  planInstanceDay: PlanInstanceDay | null;
}

export const WeekViewCards: React.FC<WeekViewCardsProps> = ({ mesocycleId }) => {
  const { schedule, loading, error } = useSchedule();

  // Process completed workouts and create map (same logic as WorkoutCalendar)
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

  // Map upcoming workouts sequentially from today (same logic as WorkoutCalendar)
  const { upcomingDatesMap } = useMemo(() => {
    if (!schedule) return { upcomingDatesMap: new Map<string, PlanInstanceDay>() };

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

        // Always add to map for handling (includes rest days)
        upcomingDatesMap.set(dateKey, upcomingDay);
        upcomingIndex++;
      }
    }

    return { upcomingDatesMap };
  }, [schedule, completedDates]);

  // Generate 7 days: 3 before today, today, 3 after today
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days: DayCardData[] = [];
    
    // Generate 7 days (3 before, today, 3 after)
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      const dateKey = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      const dayNumber = date.getDate();
      
      // Determine status
      let status: DayStatus = 'none';
      let planInstanceDay: PlanInstanceDay | null = null;
      
      // Check if it's a completed workout
      const completedDay = completedDatesMap.get(dateKey);
      if (completedDay) {
        status = 'completed';
        planInstanceDay = completedDay;
      } else {
        // Check if it's an upcoming day
        const upcomingDay = upcomingDatesMap.get(dateKey);
        if (upcomingDay) {
          if (upcomingDay.planDay.isRestDay) {
            status = 'rest';
          } else {
            status = 'upcoming';
          }
          planInstanceDay = upcomingDay;
        }
      }
      
      days.push({
        date,
        dayName,
        dayNumber,
        status,
        planInstanceDay,
      });
    }
    
    return days;
  }, [completedDatesMap, upcomingDatesMap]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={themeColors.primary.main} />
        </View>
      </View>
    );
  }

  if (error) {
    return null; // Silently fail - don't show error
  }

  const renderCard = (dayData: DayCardData, index: number) => {
    const isToday = index === 3; // Center card is today
    
    const getStatusIndicator = () => {
      switch (dayData.status) {
        case 'completed':
          return (
            <View style={[styles.statusIndicator, styles.completedIndicator]}>
              <MaterialIcons name="check-circle" size={14} color={themeColors.accent.success} />
            </View>
          );
        case 'upcoming':
          return (
            <View style={[styles.statusIndicator, styles.upcomingIndicator]}>
              <MaterialIcons name="fitness-center" size={14} color={themeColors.primary.main} />
            </View>
          );
        case 'rest':
          return (
            <View style={[styles.statusIndicator, styles.restIndicator]}>
              <MaterialIcons name="spa" size={14} color="#2196F3" />
            </View>
          );
        default:
          return null;
      }
    };

    return (
      <TouchableOpacity
        key={dayData.date.toISOString()}
        style={[
          styles.card,
          isToday && styles.todayCard,
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.dayName, isToday && styles.todayText]}>
          {dayData.dayName}
        </Text>
        <Text style={[styles.dayNumber, isToday && styles.todayText]}>
          {dayData.dayNumber}
        </Text>
        {getStatusIndicator()}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardsRow}>
        {weekDays.map((dayData, index) => renderCard(dayData, index))}
      </View>
    </View>
  );
};

// Calculate card width: (screenWidth - padding - gaps) / 7 cards
const screenWidth = Dimensions.get('window').width;
const horizontalPadding = spacing.sm * 2; // paddingHorizontal on both sides
const totalGapSpace = 7 * 6; // 4px gap between 7 cards = 6 gaps
const cardWidth = Math.floor((screenWidth - horizontalPadding - totalGapSpace) / 7);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    paddingVertical: spacing.xs, // Add padding to prevent border cutoff from scale transform
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    gap: 4,
    justifyContent: 'space-between',
  },
  card: {
    width: cardWidth,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.sm,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border.light,
    position: 'relative',
  },
  todayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: themeColors.primary.main,
    borderWidth: 2,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.text.secondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.text.primary,
  },
  todayText: {
    color: themeColors.primary.main,
  },
  statusIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  completedIndicator: {
    // Green check icon
  },
  upcomingIndicator: {
    // Blue fitness icon
  },
  restIndicator: {
    // Blue spa icon
  },
});

