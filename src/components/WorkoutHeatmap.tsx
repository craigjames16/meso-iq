import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import {
  TooltipComponent,
  CalendarComponent,
  VisualMapComponent,
} from 'echarts/components';
import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import { workoutService } from '../services/workoutService';
import { themeColors, borderRadius, spacing } from '../theme/colors';
import { useSchedule } from '../context/ScheduleContext';

// Register echarts components
echarts.use([
  TooltipComponent,
  CalendarComponent,
  VisualMapComponent,
  SVGRenderer,
  HeatmapChart,
]);

const CHART_HEIGHT = 1400;

interface WorkoutInstance {
  id: number;
  completedAt: string | null;
  exerciseSets: Array<{
    weight: number;
    reps: number;
  }>;
}

interface WorkoutHeatmapProps {
  mesocycleId?: number | null;
}

export const WorkoutHeatmap: React.FC<WorkoutHeatmapProps> = ({ mesocycleId = null }) => {
  const chartRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.sm * 6;
  const [option, setOption] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMesocycleId, setCurrentMesocycleId] = useState<number | null>(mesocycleId);
  const { schedule } = useSchedule();

  const selectedYear = selectedDate.getFullYear();
  const yearRange = useMemo(() => {
    return selectedYear.toString();
  }, [selectedYear]);

  const yearLabel = useMemo(() => {
    return selectedYear.toString();
  }, [selectedYear]);

  const handlePreviousYear = () => {
    setSelectedDate(new Date(selectedYear - 1, 0, 1));
  };

  const handleNextYear = () => {
    setSelectedDate(new Date(selectedYear + 1, 0, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Fetch current mesocycle if not provided
  useEffect(() => {
    const fetchCurrentMesocycle = async () => {
      if (currentMesocycleId) return;
      
      try {
        const data = await workoutService.getMesocycles();
        const inProgress = data.find((m: any) => m.status === 'IN_PROGRESS');
        const selectedMesocycle = inProgress || (data.length > 0 ? data[0] : null);
        if (selectedMesocycle) {
          setCurrentMesocycleId(selectedMesocycle.id);
        }
      } catch (err) {
        console.error('Error fetching mesocycles:', err);
      }
    };
    
    fetchCurrentMesocycle();
  }, [currentMesocycleId]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get<any>(
          endpoints.WORKOUT_INSTANCES.LIST
        );

        // Handle response that might be wrapped in data property
        let instances: WorkoutInstance[] = [];
        if (Array.isArray(response)) {
          instances = response;
        } else if (response?.data && Array.isArray(response.data)) {
          instances = response.data;
        } else {
          console.warn('Unexpected response format for workout instances:', response);
          instances = [];
        }

        // Process data for the entire year
        const volumeByDate: Record<string, number> = {};
        let maxVolume = 0;

        instances.forEach((instance: WorkoutInstance) => {
          if (instance.completedAt && instance.exerciseSets) {
            const date = new Date(instance.completedAt);
            // Filter by selected year
            if (date.getFullYear() === selectedYear) {
              const dateStr = date.toISOString().split('T')[0];
              const volume = instance.exerciseSets.reduce(
                (acc: number, set: any) => acc + (set.weight * set.reps),
                0
              );

              volumeByDate[dateStr] = (volumeByDate[dateStr] || 0) + volume;
              maxVolume = Math.max(maxVolume, volumeByDate[dateStr]);
            }
          }
        });

        // Generate data for all days in the year (heatmap needs data for all days)
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear + 1, 0, 0); // Last day of selected year
        const data: Array<[string, number]> = [];
        
        for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const volume = volumeByDate[dateStr] || 0;
          data.push([dateStr, volume]);
        }

        setHasData(data.some(([_, volume]) => volume > 0));

        const chartOption = {
          backgroundColor: '#1a1a1a',
          tooltip: {
            position: 'top',
            formatter: function (p: any) {
              const dateStr = p.data[0];
              const date = new Date(dateStr);
              const format = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
              return format + ': ' + p.data[1].toLocaleString();
            },
            backgroundColor: 'rgba(0,0,0,1)',
            borderColor: 'rgba(255,255,255,0.1)',
            textStyle: {
              color: '#fff',
            },
          },
          visualMap: {
            show: false,
            min: 0,
            max: maxVolume || 1000,
            inRange: {
              color: [
                themeColors.background.secondary,
                themeColors.primary.light,
                themeColors.primary.main,
              ],
            },
          },
          calendar: [
            {
              orient: 'vertical',
              range: yearRange,
              yearLabel: {
                show: false,
              },
              monthLabel: {
                show: true,
                color: themeColors.text.primary,
                margin: 10,
                nameMap: 'en',
                position: 'start',
                fontSize: 14,
              },
              dayLabel: {
                firstDay: 0,
                nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
                color: themeColors.text.secondary,
                margin: 10,
                fontSize: 12,
              },
              cellSize: [15, 'auto'],
              top: 40,
              left: 40,
              right: 20,
              itemStyle: {
                borderWidth: 1,
                borderColor: themeColors.text.muted,
                color: themeColors.background.secondary,
              },
              splitLine: {
                show: false,
              },
            },
          ],
          series: [
            {
              type: 'heatmap',
              coordinateSystem: 'calendar',
              calendarIndex: 0,
              data: data,
            },
          ],
        };
        setOption(chartOption);
      } catch (error) {
        console.error('Error fetching workout data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, schedule]);

  useEffect(() => {
    let chart: any;
    if (chartRef.current && option) {
      chart = echarts.init(chartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: CHART_HEIGHT,
      });
      chart.setOption(option);
    }
    return () => {
      chart?.dispose();
    };
  }, [option, chartWidth]);

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
        </View>
      </View>
    );
  }

  if (!option) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePreviousYear} style={styles.navButton}>
          <MaterialIcons name="chevron-left" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToday} style={styles.monthLabelContainer}>
          <Text style={styles.monthLabel}>{yearLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNextYear} style={styles.navButton}>
          <MaterialIcons name="chevron-right" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.chartContainer}>
        {hasData ? (
          <SvgChart ref={chartRef} />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No workouts found for {yearLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    // backgroundColor: themeColors.background.secondary,
    // borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginBottom: spacing.md,
    // borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.xs,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    width: '100%',
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: themeColors.text.muted,
    fontSize: 16,
  },
});

