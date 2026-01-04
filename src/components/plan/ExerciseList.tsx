import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

interface Exercise {
  id: number;
  name: string;
  category: string;
  order: number;
}

interface ExerciseListProps {
  exercises: Exercise[];
  onReorder: (data: Exercise[]) => void;
  onRemoveExercise: (exerciseId: number) => void;
}

export const ExerciseList: React.FC<ExerciseListProps> = ({
  exercises,
  onReorder,
  onRemoveExercise,
}) => {
  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;

    const newExercises = [...exercises];
    [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
    
    // Update order numbers
    const reordered = newExercises.map((exercise, idx) => ({
      ...exercise,
      order: idx + 1,
    }));
    
    onReorder(reordered);
  };

  if (exercises.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No exercises added</Text>
        <Text style={styles.emptySubtext}>
          Tap "Add Exercise" to get started
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {exercises.map((exercise, index) => (
        <View
          key={`exercise-${exercise.id}`}
          style={styles.exerciseItem}
        >
          <View style={styles.exerciseLeft}>
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{exercise.order}</Text>
            </View>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
          </View>
          <View style={styles.exerciseRight}>
            <View style={styles.reorderButtons}>
              <TouchableOpacity
                onPress={() => moveExercise(index, 'up')}
                disabled={index === 0}
                style={[
                  styles.reorderButton,
                  index === 0 && styles.reorderButtonDisabled,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="keyboard-arrow-up"
                  size={20}
                  color={index === 0 ? themeColors.text.muted : themeColors.primary.main}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveExercise(index, 'down')}
                disabled={index === exercises.length - 1}
                style={[
                  styles.reorderButton,
                  index === exercises.length - 1 && styles.reorderButtonDisabled,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={20}
                  color={index === exercises.length - 1 ? themeColors.text.muted : themeColors.primary.main}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => onRemoveExercise(exercise.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="delete"
                size={18}
                color={themeColors.accent.error}
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.background.elevated,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  reorderButton: {
    padding: spacing.xs,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeColors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: themeColors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 14,
    color: themeColors.text.primary,
    flex: 1,
  },
  exerciseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: themeColors.text.muted,
    fontSize: 12,
  },
});

