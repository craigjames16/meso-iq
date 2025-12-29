import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { processChartData, ChartDataPoint } from '../../utils/chartUtils';

interface MuscleGroupBarChartProps {
  muscleGroup: string;
  volumeInstances: any[];
  setInstances: any[];
  mode: 'volume' | 'sets';
}

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - spacing.lg * 2;
const CHART_HEIGHT = 180;

export const MuscleGroupBarChart: React.FC<MuscleGroupBarChartProps> = ({
  muscleGroup,
  volumeInstances,
  setInstances,
  mode,
}) => {
  const chartData = useMemo<ChartDataPoint[]>(
    () => processChartData(volumeInstances, setInstances),
    [volumeInstances, setInstances]
  );

  const { labels, data, avgData } = useMemo(() => {
    if (chartData.length === 0) {
      return { labels: [], data: [], avgData: [] };
    }

    const valueKey = mode === 'volume' ? 'volume' : 'sets';
    const avgKey = mode === 'volume' ? 'volumeAvg' : 'setsAvg';

    // Limit to last 10 data points for readability
    const limitedData = chartData.slice(-10);

    return {
      labels: limitedData.map((point) => point.shortDate),
      data: limitedData.map((point) => point[valueKey] || 0),
      avgData: limitedData.map((point) => point[avgKey] || 0),
    };
  }, [chartData, mode]);

  // Don't render if no data
  if (data.length === 0) {
    return null;
  }

  const barColor = mode === 'volume' ? themeColors.primary.main : themeColors.accent.warning;
  const lineColor = themeColors.accent.error;

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: themeColors.background.surface,
    backgroundGradientTo: themeColors.background.surface,
    decimalPlaces: 0,
    color: () => barColor,
    labelColor: () => themeColors.text.secondary,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForBackgroundLines: {
      stroke: themeColors.border.default,
      strokeDasharray: '4,4',
    },
    barPercentage: 0.6,
  };

  const barChartData = {
    labels: labels.map((l, i) => (i % 2 === 0 ? l : '')), // Show every other label
    datasets: [
      {
        data: data,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{muscleGroup}</Text>
        <Text style={styles.subtitle}>
          {mode === 'volume' ? 'Volume (lbs)' : 'Sets'}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={barChartData}
          width={Math.max(CHART_WIDTH, data.length * 40)}
          height={CHART_HEIGHT}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
          showValuesOnTopOfBars={data.length <= 7}
          withInnerLines
          yAxisLabel=""
          yAxisSuffix=""
        />
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: barColor }]} />
          <Text style={styles.legendText}>
            {mode === 'volume' ? 'Volume' : 'Sets'}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Avg: {Math.round(avgData.reduce((a, b) => a + b, 0) / avgData.length || 0)}
          </Text>
          <Text style={styles.statsText}>
            Max: {Math.max(...data)}
          </Text>
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
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: themeColors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statsText: {
    color: themeColors.text.muted,
    fontSize: 11,
  },
});
