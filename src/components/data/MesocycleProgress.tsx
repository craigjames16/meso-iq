import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { MesocycleSelect } from './MesocycleSelect';
import { dashboardService, Mesocycle } from '../../services/dashboardService';
import { MesocycleProgressData, PlanDay } from '../../types/mesocycle';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

// Register echarts components
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  SVGRenderer,
  BarChart,
  LineChart,
]);

const CHART_HEIGHT = 300;
const DAY_CHART_HEIGHT = 300;

// Theme-based color palette matching the app's purple/blue theme
const THEME_COLORS = [
  '#8884d8', // Purple (matches radar chart)
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#c084fc', // Light purple
  '#7c3aed', // Deep purple
  '#5b21b6', // Dark purple
  '#4f46e5', // Indigo
];

const CATEGORY_COLORS: Record<string, string> = {
  'BACK': '#3b82f6', // Blue
  'BICEPS': '#8b5cf6', // Purple
  'TRICEPS': '#be185d', // Muted Rose
  'CHEST': '#b91c1c', // Muted Red
  'SHOULDERS': '#f59e0b', // Orange
  'HAMSTRINGS': '#10b981', // Green
  'QUADS': '#059669', // Emerald
  'CALVES': '#14b8a6', // Teal
  'ABS': '#64748b', // Slate
  'CORE': '#64748b',
  'CARDIO': '#06b6d4', // Cyan
};

const getCategoryColor = (cat: string) => {
  return CATEGORY_COLORS[cat.toUpperCase()] || '#a1a1aa';
};

export const MesocycleProgress: React.FC = () => {
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [selectedMesocycleId, setSelectedMesocycleId] = useState<number | null>(null);
  const [mesocycleData, setMesocycleData] = useState<MesocycleProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.md * 4;
  const totalVolumeChartRef = useRef<any>(null);
  const dayChartRefs = useRef<Map<number, any>>(new Map());

  // Fetch mesocycles on mount
  useEffect(() => {
    const fetchMesocycles = async () => {
      try {
        const data = await dashboardService.getMesocycles();
        setMesocycles(data);
        if (data.length > 0 && !selectedMesocycleId) {
          setSelectedMesocycleId(data[0].id);
        }
      } catch (err: any) {
        console.error('Failed to fetch mesocycles', err);
        setError(err.message || 'Failed to load mesocycles');
      } finally {
        setLoading(false);
      }
    };
    fetchMesocycles();
  }, []);

  // Fetch mesocycle progress data when selection changes
  useEffect(() => {
    if (!selectedMesocycleId) {
      setMesocycleData(null);
      return;
    }

    const fetchMesocycleData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardService.getMesocycleProgress(selectedMesocycleId);
        setMesocycleData(data);
      } catch (err: any) {
        console.error('Failed to fetch mesocycle progress', err);
        setError(err.message || 'Failed to fetch mesocycle progress');
      } finally {
        setLoading(false);
      }
    };

    fetchMesocycleData();
  }, [selectedMesocycleId]);

  // Total Volume per Week chart option
  const totalVolumeChartOption = useMemo(() => {
    if (!mesocycleData?.iterationVolumes || mesocycleData.iterationVolumes.length === 0) {
      return null;
    }

    const workoutDays = mesocycleData.planDays
      .filter(day => !day.isRestDay)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    const iterations = mesocycleData.iterationVolumes
      .map(v => v.iterationNumber)
      .sort((a, b) => a - b);

    // Build raw data: for each day, get volume for each iteration
    const rawData: number[][] = workoutDays.map(day => {
      return iterations.map(iterationNumber => {
        const iteration = day.iterations.find(
          iter => iter.iterationNumber === iterationNumber && iter.completedAt
        );
        if (!iteration) return 0;
        return iteration.exercises.reduce((sum, ex) => sum + (ex.volume || 0), 0);
      });
    });

    // Calculate total volume for each iteration (week)
    const totalData: number[] = [];
    for (let i = 0; i < iterations.length; ++i) {
      let sum = 0;
      for (let j = 0; j < rawData.length; ++j) {
        sum += rawData[j][i];
      }
      totalData.push(sum);
    }

    // Create series for each day
    const series = workoutDays.map((day, dayIndex) => {
      const dayName = `Day ${day.dayNumber}`;
      const color = THEME_COLORS[dayIndex % THEME_COLORS.length];
      return {
        name: dayName,
        type: 'bar' as const,
        stack: 'total',
        barWidth: '60%',
        label: {
          show: true,
          formatter: (params: any) => {
            const value = params.value;
            const total = totalData[params.dataIndex];
            if (total <= 0) return '0%';
            const percentage = (value / total) * 100;
            return Math.round(percentage * 10) / 10 + '%';
          },
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: 'bold',
        },
        data: rawData[dayIndex].map((d, iterationIndex) => {
          const total = totalData[iterationIndex];
          return total <= 0 ? 0 : d;
        }),
        itemStyle: {
          color: color,
        },
      };
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          let result = `${params[0].name}\n`;
          let total = 0;
          params.forEach((param: any) => {
            const value = param.value;
            total += value;
            result += `${param.marker}${param.seriesName}: ${value.toLocaleString()}\n`;
          });
          result += `Total: ${total.toLocaleString()}`;
          return result;
        },
      },
      legend: {
        data: workoutDays.map(day => `Day ${day.dayNumber}`),
        bottom: -5,
        type: 'scroll',
        textStyle: {
          color: 'rgba(255,255,255,0.85)',
          fontSize: 10,
        },
        itemGap: 8,
        itemWidth: 12,
        itemHeight: 14,
      },
      grid: { left: 0, right: 20, bottom: 50, top: 20 },
      xAxis: {
        type: 'category',
        data: iterations.map(iter => `Week ${iter}`),
        nameLocation: 'center',
        nameGap: 10,
        axisLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      yAxis: {
        type: 'value',
        name: 'Volume',
        nameLocation: 'center',
        nameGap: 10,
        splitNumber: 5,
        axisLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series,
    };
  }, [mesocycleData]);

  // Initialize total volume chart
  useEffect(() => {
    let chart: any;
    if (totalVolumeChartRef.current && totalVolumeChartOption) {
      chart = echarts.init(totalVolumeChartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: CHART_HEIGHT,
      });
      chart.setOption(totalVolumeChartOption);
    }
    return () => {
      chart?.dispose();
    };
  }, [totalVolumeChartOption, chartWidth]);

  // Get day chart option
  const getDayChartOption = (day: PlanDay) => {
    const completedIterations = day.iterations
      .filter(iteration => !!iteration.completedAt)
      .sort((a, b) => a.iterationNumber - b.iterationNumber);

    if (completedIterations.length === 0) return null;

    // Calculate total volumes and percentage changes per iteration
    const iterationTotals = completedIterations.map((iteration, index) => {
      const currentVolume = iteration.exercises.reduce((sum, ex) => sum + (ex.volume || 0), 0);
      let percentChange = 0;
      if (index > 0) {
        const prevVolume = completedIterations[index - 1].exercises.reduce(
          (sum, ex) => sum + (ex.volume || 0),
          0
        );
        percentChange = prevVolume > 0 ? ((currentVolume - prevVolume) / prevVolume * 100) : 0;
      }
      return {
        volume: currentVolume,
        percentChange,
      };
    });

    const allCategories = new Set<string>();
    completedIterations.forEach(iteration => {
      iteration.exercises.forEach(ex => {
        if (ex.category) allCategories.add(ex.category);
        else allCategories.add('Other');
      });
    });
    const categories = Array.from(allCategories).sort();

    const series: any[] = categories.map(category => ({
      name: category,
      type: 'bar',
      stack: 'total',
      barWidth: '60%',
      data: completedIterations.map(iteration => {
        return iteration.exercises
          .filter(ex => (ex.category || 'Other') === category)
          .reduce((sum, ex) => sum + (ex.volume || 0), 0);
      }),
      itemStyle: { color: getCategoryColor(category) },
      label: { show: false },
    }));

    // Add a transparent line series for displaying the percentage change on top
    series.push({
      name: 'Total Change',
      type: 'line',
      symbol: 'circle',
      symbolSize: 0,
      lineStyle: { opacity: 0 },
      data: iterationTotals.map(t => t.volume),
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => {
          const index = params.dataIndex;
          const percentChange = iterationTotals[index].percentChange;
          if (index === 0 || percentChange === 0) return '';
          const sign = percentChange > 0 ? '+' : '';
          const colorStyle = percentChange > 0 ? 'pos' : 'neg';
          return `{${colorStyle}|${sign}${percentChange.toFixed(1)}%}`;
        },
        rich: {
          pos: {
            color: '#4caf50',
            fontWeight: 'bold',
            fontSize: 12,
          },
          neg: {
            color: '#f44336',
            fontWeight: 'bold',
            fontSize: 12,
          },
        },
      },
      tooltip: { show: false },
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const validParams = params.filter((p: any) => p.seriesName !== 'Total Change');
          if (validParams.length === 0) return '';

          let result = `${validParams[0].name}\n`;
          let total = 0;
          validParams.forEach((param: any) => {
            const value = param.value;
            if (value > 0) {
              total += value;
              result += `${param.marker}${param.seriesName}: ${value.toLocaleString()}\n`;
            }
          });
          result += `Total: ${total.toLocaleString()}`;

          const index = validParams[0].dataIndex;
          if (index > 0) {
            const percentChange = iterationTotals[index].percentChange;
            const sign = percentChange > 0 ? '+' : '';
            const color = percentChange > 0 ? '#4caf50' : percentChange < 0 ? '#f44336' : '#999';
            result += `\nChange: ${sign}${percentChange.toFixed(1)}%`;
          }

          return result;
        },
      },
      legend: {
        data: categories,
        bottom: 0,
        textStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
        itemGap: 20,
        itemWidth: 14,
        itemHeight: 14,
      },
      grid: { left: 0, right: 20, bottom: 50, top: 20 },
      xAxis: {
        type: 'category',
        data: completedIterations.map(iteration => `Week ${iteration.iterationNumber}`),
        nameGap: 30,
        axisLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
      },
      yAxis: {
        type: 'value',
        name: 'Volume',
        nameLocation: 'center',
        nameGap: 50,
        splitNumber: 5,
        axisLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series,
    };
  };

  if (loading && mesocycles.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading mesocycles...</Text>
      </View>
    );
  }

  if (mesocycles.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No mesocycles found</Text>
        <Text style={styles.emptySubtext}>
          Create a mesocycle to start tracking your progress
        </Text>
      </View>
    );
  }

  if (!mesocycleData && selectedMesocycleId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading mesocycle data...</Text>
      </View>
    );
  }

  if (error && !mesocycleData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!mesocycleData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No mesocycle selected</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Mesocycle Selection */}
      <MesocycleSelect
        value={selectedMesocycleId || mesocycles[0].id}
        onChange={(value) => setSelectedMesocycleId(typeof value === 'number' ? value : null)}
        showAllTime={false}
      />

      {/* Total Volume per Week Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Total Volume per Week</Text>
        <View style={styles.chartContainer}>
          {totalVolumeChartOption ? (
            <SvgChart ref={totalVolumeChartRef} />
          ) : (
            <View style={styles.emptyChartContainer}>
              <Text style={styles.emptyChartText}>No Volume Data Available</Text>
              <Text style={styles.emptyChartSubtext}>
                Complete some workouts to see your volume progress over time
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Plan Days */}
      {[...mesocycleData.planDays]
        .sort((a, b) => a.dayNumber - b.dayNumber)
        .map(day => (
          <View key={day.dayNumber} style={styles.dayContainer}>
            {!day.isRestDay ? (
              <>
                <Text style={styles.dayTitle}>Day {day.dayNumber}</Text>

                {/* Day Volume Chart */}
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Total Day Volume (By Muscle Group)</Text>
                  <DayChart
                    day={day}
                    chartWidth={chartWidth}
                    getDayChartOption={getDayChartOption}
                  />
                </View>

                {/* Exercise Progress Table */}
                {day.iterations.filter(iteration => !!iteration.completedAt).length > 1 && (
                  <View style={styles.tableCard}>
                    <Text style={styles.chartTitle}>Exercise Progress</Text>
                    <ExerciseProgressTable day={day} />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.restDayContainer}>
                <Text style={styles.dayTitle}>Day {day.dayNumber} - Rest Day</Text>
                <View style={styles.restDayChip}>
                  <Text style={styles.restDayChipText}>Rest Day</Text>
                </View>
              </View>
            )}
          </View>
        ))}
    </ScrollView>
  );
};

// Day Chart Component
interface DayChartProps {
  day: PlanDay;
  chartWidth: number;
  getDayChartOption: (day: PlanDay) => any;
}

const DayChart: React.FC<DayChartProps> = ({ day, chartWidth, getDayChartOption }) => {
  const chartRef = useRef<any>(null);
  const chartOption = getDayChartOption(day);

  useEffect(() => {
    let chart: any;
    if (chartRef.current && chartOption) {
      chart = echarts.init(chartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: DAY_CHART_HEIGHT,
      });
      chart.setOption(chartOption);
    }
    return () => {
      chart?.dispose();
    };
  }, [chartOption, chartWidth]);

  if (!chartOption) {
    return (
      <View style={styles.emptyChartContainer}>
        <Text style={styles.emptyChartText}>No Volume Data Available</Text>
        <Text style={styles.emptyChartSubtext}>
          Complete this workout to see your volume progress
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <SvgChart ref={chartRef} />
    </View>
  );
};

// Exercise Progress Table Component
interface ExerciseProgressTableProps {
  day: PlanDay;
}

const ExerciseProgressTable: React.FC<ExerciseProgressTableProps> = ({ day }) => {
  const completedIterations = day.iterations
    .filter(iteration => !!iteration.completedAt)
    .sort((a, b) => a.iterationNumber - b.iterationNumber);

  const allExercises = new Set<string>();
  completedIterations.forEach(iteration => {
    iteration.exercises.forEach(ex => {
      allExercises.add(ex.name);
    });
  });

  const exerciseNames = Array.from(allExercises);

  if (completedIterations.length < 2) {
    return (
      <View style={styles.emptyChartContainer}>
        <Text style={styles.emptyChartText}>No Progress Data Available</Text>
        <Text style={styles.emptyChartSubtext}>
          Complete at least 2 workouts to see exercise progress comparison
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.tableHeaderExercise]}>Exercise</Text>
        {completedIterations.slice(1).map(iteration => (
          <Text key={iteration.iterationNumber} style={styles.tableHeaderText}>
            Week {iteration.iterationNumber}
          </Text>
        ))}
      </View>
      {exerciseNames.map(exerciseName => (
        <View key={exerciseName} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellExercise]}>{exerciseName}</Text>
          {completedIterations.slice(1).map((iteration, index) => {
            const currentEx = iteration.exercises.find(ex => ex.name === exerciseName);
            const prevIteration = completedIterations[index];
            const prevEx = prevIteration?.exercises.find(ex => ex.name === exerciseName);

            let changeText = '-';
            let changeColor = '#666';

            if (currentEx && prevEx && prevEx.volume > 0) {
              const percentChange = ((currentEx.volume - prevEx.volume) / prevEx.volume * 100);
              const sign = percentChange > 0 ? '+' : '';
              changeText = `${sign}${percentChange.toFixed(1)}%`;
              changeColor = percentChange > 0 ? '#4caf50' : percentChange < 0 ? '#f44336' : '#666';
            } else if (currentEx && !prevEx) {
              changeText = 'New';
              changeColor = '#2196f3';
            } else if (!currentEx && prevEx) {
              changeText = 'Removed';
              changeColor = '#ff9800';
            }

            return (
              <Text
                key={`${exerciseName}-${iteration.iterationNumber}`}
                style={[styles.tableCell, { color: changeColor }]}
              >
                {changeText}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: themeColors.text.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  chartCard: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginBottom: spacing.sm,
    padding: spacing.md,
    overflow: 'hidden',
  },
  chartTitle: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  chartContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartContainer: {
    height: DAY_CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyChartText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  emptyChartSubtext: {
    color: themeColors.text.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  dayContainer: {
    marginBottom: spacing.xl,
  },
  dayTitle: {
    color: themeColors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  restDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  restDayChip: {
    backgroundColor: themeColors.background.surface,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.md,
  },
  restDayChipText: {
    color: themeColors.primary.main,
    fontSize: 12,
    fontWeight: '500',
  },
  tableCard: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginTop: spacing.sm,
    padding: spacing.md,
    overflow: 'hidden',
  },
  tableContainer: {
    marginTop: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  tableHeaderText: {
    flex: 1,
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableHeaderExercise: {
    textAlign: 'left',
    flex: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.light,
    paddingVertical: spacing.md,
  },
  tableCell: {
    flex: 1,
    color: themeColors.text.primary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  tableCellExercise: {
    textAlign: 'left',
    flex: 2,
    color: themeColors.text.primary,
    fontWeight: '500',
  },
});

