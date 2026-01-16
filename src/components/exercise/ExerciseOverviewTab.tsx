import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ExerciseDetail } from '../../types/exercise';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

interface ExerciseOverviewTabProps {
  exercise: ExerciseDetail;
}

export const ExerciseOverviewTab: React.FC<ExerciseOverviewTabProps> = ({ exercise }) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Personal Records Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Records</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Max Weight</Text>
            <Text style={styles.statValue}>{exercise.prs.maxWeight} lbs</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Max Reps</Text>
            <Text style={styles.statValue}>{exercise.prs.maxReps} reps</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Max Volume (Single Workout)</Text>
            <Text style={styles.statValue}>
              {Math.round(exercise.prs.maxVolume).toLocaleString()} lbs
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Sets</Text>
            <Text style={styles.statValue}>{exercise.totalSets}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Volume</Text>
            <Text style={styles.statValue}>
              {Math.round(exercise.totalVolume).toLocaleString()} lbs
            </Text>
          </View>
          {exercise.lastPerformed && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Last Performed</Text>
              <Text style={styles.statValue}>
                {new Date(exercise.lastPerformed).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Workouts</Text>
            <Text style={styles.statValue}>{exercise.history.length}</Text>
          </View>
        </View>
      </View>

      {/* Quick Summary */}
      {exercise.volumeProgression.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trend</Text>
          <View style={styles.card}>
            {exercise.volumeProgression.length >= 2 ? (
              (() => {
                const recent = exercise.volumeProgression.slice(-3);
                const avgRecent = recent.reduce((sum, p) => sum + p.volume, 0) / recent.length;
                const older = exercise.volumeProgression.slice(-6, -3);
                const avgOlder = older.length > 0
                  ? older.reduce((sum, p) => sum + p.volume, 0) / older.length
                  : avgRecent;
                const change = ((avgRecent - avgOlder) / avgOlder) * 100;
                const isIncreasing = change > 0;
                return (
                  <Text style={styles.trendText}>
                    {isIncreasing ? '📈' : '📉'} Volume is{' '}
                    <Text style={isIncreasing ? styles.trendPositive : styles.trendNegative}>
                      {Math.abs(change).toFixed(1)}%
                    </Text>{' '}
                    {isIncreasing ? 'higher' : 'lower'} than previous period
                  </Text>
                );
              })()
            ) : (
              <Text style={styles.trendText}>Not enough data to show trend</Text>
            )}
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  statLabel: {
    fontSize: 15,
    color: themeColors.text.secondary,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  trendText: {
    fontSize: 14,
    color: themeColors.text.secondary,
    lineHeight: 20,
  },
  trendPositive: {
    color: themeColors.accent.success,
    fontWeight: '600',
  },
  trendNegative: {
    color: themeColors.accent.error,
    fontWeight: '600',
  },
});

