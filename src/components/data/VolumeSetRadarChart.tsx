import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { MuscleGroupData } from '../../utils/chartUtils';

interface VolumeSetRadarChartProps {
  volumeData: MuscleGroupData | null;
  setData: MuscleGroupData | null;
  title?: string;
  loading?: boolean;
  error?: string | null;
}

const { width: screenWidth } = Dimensions.get('window');

// Muscle group display order
const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Abs',
];

interface MuscleMetric {
  muscleGroup: string;
  volumeTotal: number;
  setTotal: number;
}

export const VolumeSetRadarChart: React.FC<VolumeSetRadarChartProps> = ({
  volumeData,
  setData,
  title = 'Volume & Sets by Muscle Group',
  loading = false,
  error = null,
}) => {
  const metrics = useMemo<MuscleMetric[]>(() => {
    if (!volumeData && !setData) return [];

    const result: MuscleMetric[] = [];
    const allGroups = new Set<string>();
    
    if (volumeData) Object.keys(volumeData).forEach((g) => allGroups.add(g));
    if (setData) Object.keys(setData).forEach((g) => allGroups.add(g));

    allGroups.forEach((muscleGroup) => {
      const volumeInstances = volumeData?.[muscleGroup] || [];
      const setInstances = setData?.[muscleGroup] || [];

      const volumeTotal = volumeInstances.reduce((sum, inst) => {
        const entry = Object.values(inst)[0] as { volume?: number };
        return sum + (entry?.volume ?? 0);
      }, 0);

      const setTotal = setInstances.reduce((sum, inst) => {
        const entry = Object.values(inst)[0] as { count?: number };
        return sum + (entry?.count ?? 0);
      }, 0);

      if (volumeTotal > 0 || setTotal > 0) {
        result.push({ muscleGroup, volumeTotal, setTotal });
      }
    });

    // Sort by predefined order
    return result.sort((a, b) => {
      const aIdx = MUSCLE_GROUPS.indexOf(a.muscleGroup);
      const bIdx = MUSCLE_GROUPS.indexOf(b.muscleGroup);
      if (aIdx === -1 && bIdx === -1) return a.muscleGroup.localeCompare(b.muscleGroup);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [volumeData, setData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (metrics.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const maxVolume = Math.max(...metrics.map((m) => m.volumeTotal), 1);
  const maxSets = Math.max(...metrics.map((m) => m.setTotal), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.summaryContainer}>
        {metrics.map((metric) => {
          const volumePct = (metric.volumeTotal / maxVolume) * 100;
          const setPct = (metric.setTotal / maxSets) * 100;

          return (
            <View key={metric.muscleGroup} style={styles.metricRow}>
              <Text style={styles.muscleGroupLabel}>{metric.muscleGroup}</Text>
              <View style={styles.barsContainer}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      styles.volumeBar,
                      { width: `${Math.max(volumePct, 2)}%` },
                    ]}
                  />
                </View>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      styles.setsBar,
                      { width: `${Math.max(setPct, 2)}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.valuesContainer}>
                <Text style={styles.volumeValue}>
                  {metric.volumeTotal >= 1000
                    ? `${(metric.volumeTotal / 1000).toFixed(1)}k`
                    : metric.volumeTotal}
                </Text>
                <Text style={styles.setsValue}>{metric.setTotal}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: themeColors.primary.main }]} />
          <Text style={styles.legendText}>Volume (lbs)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: themeColors.accent.warning }]} />
          <Text style={styles.legendText}>Sets</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  title: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  noDataText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  summaryContainer: {
    gap: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muscleGroupLabel: {
    color: themeColors.text.secondary,
    fontSize: 11,
    width: 70,
  },
  barsContainer: {
    flex: 1,
    gap: 3,
  },
  barWrapper: {
    height: 8,
    backgroundColor: themeColors.background.elevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  volumeBar: {
    backgroundColor: themeColors.primary.main,
  },
  setsBar: {
    backgroundColor: themeColors.accent.warning,
  },
  valuesContainer: {
    width: 60,
    alignItems: 'flex-end',
    gap: 2,
  },
  volumeValue: {
    color: themeColors.primary.light,
    fontSize: 10,
    fontWeight: '600',
  },
  setsValue: {
    color: themeColors.accent.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeColors.border.default,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    color: themeColors.text.secondary,
    fontSize: 12,
  },
});
