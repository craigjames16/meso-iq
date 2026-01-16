import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { ExerciseDetail } from '../../types/exercise';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { SegmentedControl } from '../data';

// Register echarts components
echarts.use([
  TooltipComponent,
  GridComponent,
  SVGRenderer,
  BarChart,
  LineChart,
]);

const CHART_HEIGHT = 250;

interface ExerciseChartsTabProps {
  exercise: ExerciseDetail;
}

type ChartType = 'volume' | 'sets';

const chartSegments = [
  { label: 'Volume', value: 'volume' },
  { label: 'Sets', value: 'sets' },
];

export const ExerciseChartsTab: React.FC<ExerciseChartsTabProps> = ({ exercise }) => {
  const [activeChart, setActiveChart] = useState<ChartType>('volume');
  const volumeChartRef = useRef<any>(null);
  const setsChartRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.md * 4;

  // Transform data for volume chart (with rolling average)
  const volumeTransformedData = useMemo(() => {
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

  // Transform data for sets chart
  const setsTransformedData = useMemo(() => {
    return exercise.volumeProgression.map(point => ({
      instanceId: point.workoutInstanceId,
      sets: point.sets,
      date: point.date,
      shortDate: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [exercise.volumeProgression]);

  // Volume chart option (line chart)
  const volumeChartOption = useMemo(() => {
    if (volumeTransformedData.length === 0) return null;

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
        left: 50,
        right: 20,
        bottom: 40,
        top: 20,
      },
      xAxis: {
        type: 'category',
        data: volumeTransformedData.map(d => d.shortDate),
        axisLabel: {
          fontSize: 10,
          rotate: volumeTransformedData.length > 6 ? 45 : 0,
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
        splitLine: {
          lineStyle: { color: themeColors.border.default },
        },
      },
      series: [
        {
          name: 'Volume',
          type: 'line',
          data: volumeTransformedData.map(d => d.volume),
          itemStyle: { color: themeColors.chart.volume },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 6,
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(130, 202, 157, 0.3)' },
                { offset: 1, color: 'rgba(130, 202, 157, 0)' },
              ],
            },
          },
        },
        {
          name: 'Rolling Average',
          type: 'line',
          data: volumeTransformedData.map(d => d.rollingVolume),
          itemStyle: {
            color: themeColors.accent.warning,
          },
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: themeColors.accent.warning,
          },
          symbol: 'circle',
          symbolSize: 4,
          smooth: true,
        },
      ],
    };
  }, [volumeTransformedData]);

  // Sets chart option (bar chart)
  const setsChartOption = useMemo(() => {
    if (setsTransformedData.length === 0) return null;

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
      },
      grid: { left: 40, right: 20, bottom: 40, top: 20 },
      xAxis: {
        type: 'category',
        data: setsTransformedData.map(d => d.shortDate),
        axisLabel: {
          fontSize: 10,
          color: themeColors.text.secondary,
          rotate: setsTransformedData.length > 6 ? 45 : 0,
        },
        axisLine: {
          lineStyle: { color: themeColors.border.default },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: themeColors.text.secondary,
        },
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: themeColors.border.default },
        },
      },
      series: [
        {
          name: 'Sets',
          data: setsTransformedData.map(d => d.sets),
          type: 'bar',
          itemStyle: {
            color: themeColors.chart.sets,
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '60%',
        },
      ],
    };
  }, [setsTransformedData]);

  // Initialize volume chart
  useEffect(() => {
    let chart: any;
    if (volumeChartRef.current && volumeChartOption && activeChart === 'volume') {
      chart = echarts.init(volumeChartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: CHART_HEIGHT,
      });
      chart.setOption(volumeChartOption);
    }
    return () => {
      chart?.dispose();
    };
  }, [volumeChartOption, chartWidth, activeChart]);

  // Initialize sets chart
  useEffect(() => {
    let chart: any;
    if (setsChartRef.current && setsChartOption && activeChart === 'sets') {
      chart = echarts.init(setsChartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: CHART_HEIGHT,
      });
      chart.setOption(setsChartOption);
    }
    return () => {
      chart?.dispose();
    };
  }, [setsChartOption, chartWidth, activeChart]);

  if (exercise.volumeProgression.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No chart data available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Chart Type Selector */}
      <SegmentedControl
        segments={chartSegments}
        value={activeChart}
        onChange={(value) => setActiveChart(value as ChartType)}
      />

      {/* Volume Chart */}
      {activeChart === 'volume' && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Volume Progression</Text>
          <View style={styles.chartContainer}>
            {volumeChartOption ? (
              <SvgChart ref={volumeChartRef} />
            ) : (
              <Text style={styles.emptyText}>No data to display</Text>
            )}
          </View>
        </View>
      )}

      {/* Sets Chart */}
      {activeChart === 'sets' && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Sets Over Time</Text>
          <View style={styles.chartContainer}>
            {setsChartOption ? (
              <SvgChart ref={setsChartRef} />
            ) : (
              <Text style={styles.emptyText}>No data to display</Text>
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
  chartSection: {
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.md,
  },
  chartContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    overflow: 'hidden',
  },
});

