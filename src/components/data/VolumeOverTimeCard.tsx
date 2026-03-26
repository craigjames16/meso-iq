import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { SegmentedControl } from './SegmentedControl';
import { useSchedule } from '../../context/ScheduleContext';
import type { WorkoutInstance } from '../../types/workout';

echarts.use([
  TooltipComponent,
  GridComponent,
  SVGRenderer,
  LineChart,
]);

const CHART_HEIGHT = 220;

type PeriodValue = '30' | '90' | '365';

const periodSegments = [
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
  { label: '1 Year', value: '365' },
];

function getVolumeForInstance(instance: WorkoutInstance): number {
  if (instance.exerciseSets && instance.exerciseSets.length > 0) {
    return instance.exerciseSets.reduce(
      (total: number, set: { weight: number; reps: number }) =>
        total + set.weight * set.reps,
      0
    );
  }
  if (instance.workoutExercises && instance.workoutExercises.length > 0) {
    return (instance.workoutExercises as any[]).reduce(
      (total: number, we: any) =>
        total +
        (we.sets || []).reduce(
          (s: number, set: any) => s + (set.weight || 0) * (set.reps || 0),
          0
        ),
      0
    );
  }
  return 0;
}

export const VolumeOverTimeCard: React.FC = () => {
  const [period, setPeriod] = useState<PeriodValue>('30');
  const chartRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.md * 2;
  const { schedule, loading: scheduleLoading } = useSchedule();

  const chartData = useMemo(() => {
    const instances = schedule?.workoutInstances ?? [];
    const days = parseInt(period, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const volumeByDate: Record<string, number> = {};

    instances.forEach((instance: WorkoutInstance) => {
      if (!instance.completedAt) return;
      const date = new Date(instance.completedAt);
      if (date < cutoff) return;

      const dateStr = date.toISOString().split('T')[0];
      const volume = getVolumeForInstance(instance);
      volumeByDate[dateStr] = (volumeByDate[dateStr] || 0) + volume;
    });

    const sortedDates = Object.keys(volumeByDate).sort();
    return sortedDates.map((dateStr) => ({
      dateStr,
      shortDate: new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      volume: volumeByDate[dateStr],
    }));
  }, [schedule?.workoutInstances, period]);

  const chartOption = useMemo(() => {
    if (chartData.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: {
          color: '#fff',
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!params?.length) return '';
          let result = `${params[0].name}\n`;
          params.forEach((param: any) => {
            result += `${param.marker}${param.seriesName}: ${Number(param.value).toLocaleString()}\n`;
          });
          return result;
        },
      },
      grid: {
        left: 44,
        right: 12,
        bottom: 40,
        top: 20,
      },
      xAxis: {
        type: 'category',
        data: chartData.map((d) => d.shortDate),
        axisLabel: {
          fontSize: 10,
          rotate: chartData.length > 6 ? 45 : 0,
          color: themeColors.text.secondary,
        },
        axisLine: {
          lineStyle: {
            color: themeColors.border.default,
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        splitNumber: 5,
        axisLabel: {
          fontSize: 10,
          color: themeColors.text.secondary,
        },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      series: [
        {
          name: 'Volume',
          type: 'line',
          data: chartData.map((d) => d.volume),
          itemStyle: { color: themeColors.chart.volume },
          lineStyle: { width: 2 },
          symbol: 'none',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(45, 115, 212, 0.3)' },
                { offset: 1, color: 'rgba(45, 115, 212, 0)' },
              ],
            },
          },
        },
      ],
    };
  }, [chartData]);

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

  const loading = scheduleLoading;
  const empty = !loading && (!schedule?.workoutInstances?.length || chartData.length === 0);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Volume Over Time</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={themeColors.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Volume Over Time</Text>
      <SegmentedControl
        segments={periodSegments}
        value={period}
        onChange={(value) => setPeriod(value as PeriodValue)}
      />
      <View style={styles.chartContainer}>
        {empty ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No workout data for this period</Text>
          </View>
        ) : chartOption ? (
          <View style={[styles.chartWrapper, { width: chartWidth }]}>
            <SvgChart ref={chartRef} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  chartContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    overflow: 'hidden',
    alignItems: 'center',
  },
  chartWrapper: {
    height: CHART_HEIGHT,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: themeColors.text.muted,
    textAlign: 'center',
  },
});
