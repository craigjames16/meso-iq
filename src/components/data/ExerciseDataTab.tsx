import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseStats } from '../../types/exercise';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

interface ExerciseDataTabProps {
  exerciseStats: ExerciseStats | null;
}

export const ExerciseDataTab: React.FC<ExerciseDataTabProps> = ({
  exerciseStats,
}) => {
  const [expandedExercise, setExpandedExercise] = useState<number | false>(false);

  const handleToggleExpand = (exerciseId: number) => {
    setExpandedExercise(expandedExercise === exerciseId ? false : exerciseId);
  };

  // Get remaining exercises (all exercises except the top 3)
  const remainingExercises = exerciseStats
    ? exerciseStats.allExercises.filter(
        exercise => !exerciseStats.topExercises.some(top => top.id === exercise.id)
      )
    : [];

  if (!exerciseStats) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No exercise data available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top 3 Exercises Section */}
      {exerciseStats.topExercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Exercises</Text>
          <View style={styles.topExercisesGrid}>
            {exerciseStats.topExercises.map(exercise => (
              <View key={exercise.id} style={styles.topExerciseCard}>
                <ExerciseCard exercise={exercise} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Remaining Exercises List */}
      {remainingExercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Exercises</Text>
          <View style={styles.exercisesList}>
            {remainingExercises.map(exercise => {
              const isExpanded = expandedExercise === exercise.id;
              return (
                <View key={exercise.id} style={styles.accordion}>
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => handleToggleExpand(exercise.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.accordionHeaderText}>{exercise.name}</Text>
                    <View style={styles.accordionHeaderRight}>
                      <Text style={styles.accordionHeaderMeta}>
                        {exercise.totalSets} sets
                      </Text>
                      <Text style={styles.accordionHeaderMeta}>
                        {Math.round(exercise.totalVolume).toLocaleString()} volume
                      </Text>
                      <MaterialIcons
                        name={isExpanded ? 'expand-less' : 'expand-more'}
                        size={24}
                        color={themeColors.text.primary}
                      />
                    </View>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.accordionContent}>
                      <ExerciseCard exercise={exercise} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  contentContainer: {
    padding: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: themeColors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  topExercisesGrid: {
    gap: spacing.md,
  },
  topExerciseCard: {
    marginBottom: spacing.sm,
  },
  exercisesList: {
    gap: spacing.sm,
  },
  accordion: {
    // backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  accordionHeaderText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accordionHeaderMeta: {
    color: themeColors.text.secondary,
    fontSize: 14,
  },
  accordionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});

