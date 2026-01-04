import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
} from 'echarts/components';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { MuscleGroupData } from '../../utils/chartUtils';

// Register echarts components
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
  SVGRenderer,
  RadarChart,
]);

interface VolumeSetRadarChartProps {
  volumeData: MuscleGroupData | null;
  setData: MuscleGroupData | null;
  title?: string;
  loading?: boolean;
  error?: string | null;
}

const CHART_HEIGHT = 350;

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
  const chartRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.md * 4; // Account for container padding

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

  const chartOption = useMemo(() => {
    if (metrics.length === 0) return null;

    const maxVolume = Math.max(...metrics.map((m) => m.volumeTotal), 1);
    const maxSets = Math.max(...metrics.map((m) => m.setTotal), 1);

    const indicators = metrics.map((metric) => ({
      name: metric.muscleGroup,
      max: 100, // Normalized to 100 for percentage display
    }));

    const volumeDataNormalized = metrics.map((metric) =>
      Math.round((metric.volumeTotal / maxVolume) * 100)
    );
    const setsDataNormalized = metrics.map((metric) =>
      Math.round((metric.setTotal / maxSets) * 100)
    );

    return {
      backgroundColor: 'transparent',
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          color: themeColors.text.primary,
          fontSize: 16,
          fontWeight: '700',
        },
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: themeColors.background.secondary,
        borderColor: themeColors.border.default,
        borderWidth: 1,
        textStyle: {
          color: themeColors.text.primary,
        },
        formatter: (params: any) => {
          const index = params.dataIndex;
          const metric = metrics[index];
          const volumeFormatted =
            metric.volumeTotal >= 1000
              ? `${(metric.volumeTotal / 1000).toFixed(1)}k`
              : metric.volumeTotal;
          return `${metric.muscleGroup}<br/>${params.seriesName}: ${params.value}%<br/>Volume: ${volumeFormatted} lbs<br/>Sets: ${metric.setTotal}`;
        },
      },
      legend: {
        data: ['Volume', 'Sets'],
        bottom: 0,
        textStyle: {
          color: themeColors.text.secondary,
        },
        itemStyle: {
          borderColor: themeColors.border.default,
        },
      },
      radar: {
        indicator: indicators,
        center: ['50%', '55%'],
        radius: '65%',
        name: {
          textStyle: {
            color: themeColors.text.secondary,
            fontSize: 11,
          },
        },
        splitArea: {
          areaStyle: {
            color: [
              'rgba(255, 255, 255, 0.02)',
              'rgba(255, 255, 255, 0.04)',
              'rgba(255, 255, 255, 0.06)',
              'rgba(255, 255, 255, 0.08)',
            ],
          },
        },
        splitLine: {
          lineStyle: {
            color: themeColors.border.default,
          },
        },
        axisLine: {
          lineStyle: {
            color: themeColors.border.default,
          },
        },
      },
      series: [
        {
          name: 'Volume',
          type: 'radar',
          data: [
            {
              value: volumeDataNormalized,
              name: 'Volume',
              areaStyle: {
                color: themeColors.primary.main,
                opacity: 0.3,
              },
              lineStyle: {
                color: themeColors.primary.main,
                width: 2,
              },
              itemStyle: {
                color: themeColors.primary.main,
              },
            },
          ],
        },
        {
          name: 'Sets',
          type: 'radar',
          color: themeColors.chart.sets,
          data: [
            {
              value: setsDataNormalized,
              name: 'Sets',
              areaStyle: {
                color: themeColors.chart.sets,
                opacity: 0.3,
              },
              lineStyle: {
                color: themeColors.chart.sets,
                width: 2,
              },
              itemStyle: {
                color: themeColors.chart.sets,
                borderWidth: 2,
              },
            },
          ],
        },
      ],
    };
  }, [metrics, title]);

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

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <SvgChart ref={chartRef} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // backgroundColor: themeColors.background.surface,
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
  chartContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
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
});
