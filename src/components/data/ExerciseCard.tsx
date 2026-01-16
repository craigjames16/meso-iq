import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { ExerciseStat } from '../../types/exercise';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

// Register echarts components
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  SVGRenderer,
  BarChart,
  LineChart,
]);

const CHART_HEIGHT = 200;

interface ExerciseCardProps {
  exercise: ExerciseStat;
}

interface ExerciseTransformedDataPoint {
  instanceId: number;
  rollingVolume: number;
  volume: number;
  date: string;
  shortDate: string;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise }) => {
  const chartRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.md * 4;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = () => {
    navigation.navigate('ExerciseDetail', { exerciseId: exercise.id });
  };

  const transformedData: ExerciseTransformedDataPoint[] = useMemo(() => {
    return exercise.volumeProgression.map((point, index) => {
      let rollingVolume = point.volume;

      if (index >= 3) {
        const startIdx = Math.max(0, index - 3);
        const relevantPoints = exercise.volumeProgression.slice(startIdx, index + 1);
        rollingVolume =
          relevantPoints.map(p => p.volume).reduce((acc, curr) => acc + curr, 0) / 3;
      }

      return {
        instanceId: point.workoutInstanceId,
        rollingVolume,
        volume: point.volume,
        date: point.date,
        shortDate: new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };
    });
  }, [exercise.volumeProgression]);

  const chartOption = useMemo(() => {
    if (transformedData.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999',
          },
        },
        formatter: (params: any) => {
          let result = `${params[0].name}\n`;
          params.forEach((param: any) => {
            const value =
              param.seriesName === 'Rolling Average'
                ? param.value.toFixed(1)
                : param.value.toLocaleString();
            result += `${param.marker}${param.seriesName}: ${value}\n`;
          });
          return result;
        },
      },
      grid: {
        left: 40,
        right: 20,
        bottom: 40,
        top: 20,
      },
      xAxis: [
        {
          type: 'category',
          data: transformedData.map(d => d.shortDate),
          axisLabel: {
            fontSize: 10,
            rotate: transformedData.length > 6 ? 45 : 0,
            color: 'rgba(255, 255, 255, 0.7)',
          },
          axisLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
      ],
      yAxis: [
        {
          type: 'value',
          splitNumber: 5,
          axisLabel: {
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.7)',
          },
          splitLine: {
            show: false,
          },
          axisLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
      ],
      series: [
        {
          name: 'Volume',
          type: 'bar',
          data: transformedData.map(d => d.volume),
          itemStyle: {
            color: '#8884d8',
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '60%',
        },
        {
          name: 'Rolling Average',
          type: 'line',
          data: transformedData.map(d => d.rollingVolume),
          itemStyle: {
            color: '#ff7300',
          },
          lineStyle: {
            width: 2,
            color: '#ff7300',
          },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true,
        },
      ],
    };
  }, [transformedData]);

  useEffect(() => {
    let chart: any;
    if (chartRef.current && chartOption) {
      chart = echarts.init(chartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: CHART_HEIGHT,
      });
      chart.setOption(chartOption);
    }
    return () => {
      chart?.dispose();
    };
  }, [chartOption, chartWidth]);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{exercise.category}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* PRs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Records</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Max Weight</Text>
          <Text style={styles.statValue}>{exercise.prs.maxWeight} lbs</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Max Volume</Text>
          <Text style={styles.statValue}>
            {Math.round(exercise.prs.maxVolume).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats Section */}
      <View style={styles.section}>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Total Sets</Text>
          <Text style={styles.statValue}>{exercise.totalSets}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>Total Volume</Text>
          <Text style={styles.statValue}>
            {Math.round(exercise.totalVolume).toLocaleString()}
          </Text>
        </View>
        {exercise.lastPerformed && (
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Last Performed</Text>
            <Text style={styles.statValue}>
              {new Date(exercise.lastPerformed).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Volume Progression Chart */}
      {exercise.volumeProgression.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Volume Progression</Text>
            <View style={styles.chartContainer}>
              <SvgChart ref={chartRef} />
            </View>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    // backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseName: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  categoryChip: {
    backgroundColor: themeColors.overlay.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    color: themeColors.text.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.border.default,
    marginVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statLabel: {
    color: themeColors.text.secondary,
    fontSize: 14,
  },
  statValue: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  chartSection: {
    marginTop: spacing.md,
  },
  chartContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    marginTop: spacing.sm,
  },
});

