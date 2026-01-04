import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

interface Exercise {
  id: number;
  name: string;
  category: string;
  order: number;
}

interface DayRowProps {
  dayId: string;
  dayNumber: number;
  isRestDay: boolean;
  exercises: Exercise[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleRestDay: () => void;
  onDeleteDay: () => void;
  onAddExercise: () => void;
  children?: React.ReactNode; // ExerciseList component
}

export const DayRow: React.FC<DayRowProps> = ({
  dayId,
  dayNumber,
  isRestDay,
  exercises,
  isExpanded,
  onToggleExpand,
  onToggleRestDay,
  onDeleteDay,
  onAddExercise,
  children,
}) => {
  const [rotateAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={onToggleExpand}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={themeColors.text.secondary}
            />
          </Animated.View>
          {isRestDay ? (
            <MaterialIcons
              name="hotel"
              size={20}
              color={themeColors.text.muted}
              style={styles.dayIcon}
            />
          ) : (
            <MaterialIcons
              name="fitness-center"
              size={20}
              color={themeColors.primary.main}
              style={styles.dayIcon}
            />
          )}
          <Text style={styles.dayTitle}>Day {dayNumber}</Text>
          {isRestDay && (
            <View style={styles.restBadge}>
              <Text style={styles.restBadgeText}>Rest Day</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Rest</Text>
            <Switch
              value={isRestDay}
              onValueChange={onToggleRestDay}
              trackColor={{
                false: themeColors.background.elevated,
                true: themeColors.primary.main,
              }}
              thumbColor={themeColors.text.primary}
            />
          </View>
          <TouchableOpacity
            onPress={onDeleteDay}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="delete"
              size={20}
              color={themeColors.accent.error}
            />
          </TouchableOpacity>
        </View>
      </View>

      {isExpanded && !isRestDay && (
        <View style={styles.content}>
          {children}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={onAddExercise}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="add"
              size={20}
              color={themeColors.primary.main}
            />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>
      )}

      {isExpanded && isRestDay && (
        <View style={styles.content}>
          <Text style={styles.restDayText}>Rest and recovery day</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayIcon: {
    marginLeft: spacing.sm,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
  },
  restBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  restBadgeText: {
    color: themeColors.text.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchLabel: {
    fontSize: 12,
    color: themeColors.text.secondary,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background.elevated,
    borderWidth: 1,
    borderColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  addExerciseText: {
    color: themeColors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  restDayText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});

