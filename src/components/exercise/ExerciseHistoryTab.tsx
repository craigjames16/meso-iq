import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { HistoryInstance, ExerciseSet } from '../../types/exercise';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

interface ExerciseHistoryTabProps {
  history: HistoryInstance[];
}

export const ExerciseHistoryTab: React.FC<ExerciseHistoryTabProps> = ({ history }) => {
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (sortedHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No previous history found for this exercise.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {sortedHistory.map((instance, index) => {
        // Group sets by weight
        const setsByWeight = (instance.sets || []).reduce((acc, set) => {
          if (!acc[set.weight]) {
            acc[set.weight] = [];
          }
          acc[set.weight].push(set);
          return acc;
        }, {} as Record<number, ExerciseSet[]>);

        const setEntries = Object.entries(setsByWeight)
          .sort(([weightA], [weightB]) => Number(weightB) - Number(weightA));

        return (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>{formatDate(instance.completedAt)}</Text>
              <Text style={styles.historyVolume}>{instance.volume.toLocaleString()} lbs</Text>
            </View>
            {setEntries.length > 0 && (
              <View style={styles.setsRow}>
                {setEntries.map(([weight, sets], idx) => (
                  <Text key={weight} style={styles.setText}>
                    {weight}lbs × {sets.map(set => set.reps).join(', ')}
                    {idx < setEntries.length - 1 && ' • '}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 15,
    color: themeColors.text.muted,
    textAlign: 'center',
  },
  historyItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  historyVolume: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text.secondary,
  },
  setsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  setText: {
    fontSize: 13,
    color: themeColors.text.secondary,
  },
});

