import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { SegmentedControl } from './SegmentedControl';
import { ExerciseStats, ExerciseStat } from '../../types/exercise';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

// Register echarts components
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  SVGRenderer,
  BarChart,
  PieChart,
]);

// Category colors matching MesocycleProgress
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

const CHART_HEIGHT = 450;

interface ExerciseDataTabProps {
  exerciseStats: ExerciseStats | null;
}

interface RecordHolder {
  title: string;
  icon: string;
  exercise: ExerciseStat | null;
  value: string;
  subtitle: string;
}

export const ExerciseDataTab: React.FC<ExerciseDataTabProps> = ({
  exerciseStats,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.md * 4;
  
  // Chart mode state
  const [pieChartMode, setPieChartMode] = useState<'volume' | 'sets'>('volume');
  const [barChartMode, setBarChartMode] = useState<'volume' | 'sets'>('volume');
  
  // Chart refs
  const categoryPieChartRef = useRef<any>(null);
  const topExercisesBarChartRef = useRef<any>(null);

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    if (!exerciseStats) return null;

    const { allExercises } = exerciseStats;
    
    const totalVolume = allExercises.reduce((sum, ex) => sum + ex.totalVolume, 0);
    const totalSets = allExercises.reduce((sum, ex) => sum + ex.totalSets, 0);
    const uniqueExercises = allExercises.length;

    return { totalVolume, totalSets, uniqueExercises };
  }, [exerciseStats]);

  // Calculate record holders
  const recordHolders = useMemo((): RecordHolder[] => {
    if (!exerciseStats) return [];

    const { allExercises } = exerciseStats;
    if (allExercises.length === 0) return [];

    // Heaviest Lift
    const heaviest = allExercises.reduce((max, ex) => 
      ex.prs.maxWeight > (max?.prs.maxWeight || 0) ? ex : max, allExercises[0]);

    // Most Performed (total sets)
    const mostPerformed = allExercises.reduce((max, ex) => 
      ex.totalSets > (max?.totalSets || 0) ? ex : max, allExercises[0]);

    // Highest Total Volume
    const highestVolume = allExercises.reduce((max, ex) => 
      ex.totalVolume > (max?.totalVolume || 0) ? ex : max, allExercises[0]);

    // Best Single Session (maxVolume PR)
    const bestSession = allExercises.reduce((max, ex) => 
      ex.prs.maxVolume > (max?.prs.maxVolume || 0) ? ex : max, allExercises[0]);

    // Most Reps in a Set
    const mostReps = allExercises.reduce((max, ex) => 
      ex.prs.maxReps > (max?.prs.maxReps || 0) ? ex : max, allExercises[0]);

    // Most Consistent (most workout instances)
    const mostConsistent = allExercises.reduce((max, ex) => 
      ex.volumeProgression.length > (max?.volumeProgression.length || 0) ? ex : max, allExercises[0]);

    return [
      {
        title: 'Heaviest Lift',
        icon: 'fitness-center',
        exercise: heaviest,
        value: `${heaviest.prs.maxWeight} lbs`,
        subtitle: heaviest.name,
      },
      {
        title: 'Most Performed',
        icon: 'repeat',
        exercise: mostPerformed,
        value: `${mostPerformed.totalSets} sets`,
        subtitle: mostPerformed.name,
      },
      {
        title: 'Volume Champion',
        icon: 'trending-up',
        exercise: highestVolume,
        value: `${Math.round(highestVolume.totalVolume).toLocaleString()}`,
        subtitle: highestVolume.name,
      },
      {
        title: 'Best Single Session',
        icon: 'bolt',
        exercise: bestSession,
        value: `${Math.round(bestSession.prs.maxVolume).toLocaleString()}`,
        subtitle: bestSession.name,
      },
      {
        title: 'Most Reps',
        icon: 'speed',
        exercise: mostReps,
        value: `${mostReps.prs.maxReps} reps`,
        subtitle: mostReps.name,
      },
      {
        title: 'Most Consistent',
        icon: 'calendar-today',
        exercise: mostConsistent,
        value: `${mostConsistent.volumeProgression.length} sessions`,
        subtitle: mostConsistent.name,
      },
    ];
  }, [exerciseStats]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!exerciseStats) return [];

    const { allExercises } = exerciseStats;
    const categoryMap = new Map<string, { count: number; volume: number; sets: number }>();

    allExercises.forEach(ex => {
      const existing = categoryMap.get(ex.category) || { count: 0, volume: 0, sets: 0 };
      categoryMap.set(ex.category, {
        count: existing.count + 1,
        volume: existing.volume + ex.totalVolume,
        sets: existing.sets + ex.totalSets,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.volume - a.volume);
  }, [exerciseStats]);

  // Prepare pie chart data for volume by category
  const volumePieData = useMemo(() => {
    if (!categoryBreakdown.length) return [];
    return categoryBreakdown.map(cat => ({
      value: Math.round(cat.volume),
      name: cat.category,
      itemStyle: {
        color: getCategoryColor(cat.category),
      },
    }));
  }, [categoryBreakdown]);

  // Prepare pie chart data for sets by category
  const setsPieData = useMemo(() => {
    if (!categoryBreakdown.length) return [];
    return categoryBreakdown.map(cat => ({
      value: cat.sets,
      name: cat.category,
      itemStyle: {
        color: getCategoryColor(cat.category),
      },
    }));
  }, [categoryBreakdown]);

  // Prepare top exercises bar chart data (for both volume and sets)
  const topExercisesBarData = useMemo(() => {
    if (!exerciseStats) return { 
      volume: { names: [], values: [], exercises: [] },
      sets: { names: [], values: [], exercises: [] }
    };
    
    // Top 10 by volume
    const top10Volume = [...exerciseStats.allExercises]
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10)
      .reverse(); // Reverse for horizontal bar (lowest to highest)
    
    // Top 10 by sets
    const top10Sets = [...exerciseStats.allExercises]
      .sort((a, b) => b.totalSets - a.totalSets)
      .slice(0, 10)
      .reverse(); // Reverse for horizontal bar (lowest to highest)
    
    return {
      volume: {
        names: top10Volume.map(ex => ex.name),
        values: top10Volume.map(ex => Math.round(ex.totalVolume)),
        exercises: top10Volume,
      },
      sets: {
        names: top10Sets.map(ex => ex.name),
        values: top10Sets.map(ex => ex.totalSets),
        exercises: top10Sets,
      },
    };
  }, [exerciseStats]);

  // Combined pie chart option (switches between volume and sets)
  const categoryPieChartOption = useMemo(() => {
    const data = pieChartMode === 'volume' ? volumePieData : setsPieData;
    if (data.length === 0) return null;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const unit = pieChartMode === 'volume' ? 'lbs' : 'sets';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const percent = params.percent;
          const value = params.value.toLocaleString();
          return `${params.name}<br/>${value} ${unit} (${percent}%)`;
        },
        backgroundColor: themeColors.background.secondary,
        borderColor: themeColors.border.default,
        borderWidth: 1,
        textStyle: {
          color: themeColors.text.primary,
        },
      },
      legend: {
        orient: 'horizontal',
        bottom: 20,
        left: 'center',
        textStyle: {
          color: themeColors.text.secondary,
          fontSize: 11,
        },
        formatter: (name: string) => {
          const item = data.find(d => d.name === name);
          if (!item) return name;
          const percent = ((item.value / total) * 100).toFixed(1);
          return `${name}: ${percent}%`;
        },
        itemGap: 12,
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'], // Donut style, back to original size
          center: ['50%', '32%'], // Centered, moved up significantly to create large space for bottom legend
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: themeColors.background.primary,
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: themeColors.text.primary,
            },
          },
          data: data,
        },
      ],
    };
  }, [volumePieData, setsPieData, pieChartMode]);

  // Top exercises horizontal bar chart option (switches between volume and sets)
  const topExercisesBarChartOption = useMemo(() => {
    const data = barChartMode === 'volume' ? topExercisesBarData.volume : topExercisesBarData.sets;
    if (!data.names.length) return null;

    const unit = barChartMode === 'volume' ? 'lbs' : 'sets';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const param = params[0];
          return `${param.name}<br/>${param.value.toLocaleString()} ${unit}`;
        },
        backgroundColor: themeColors.background.secondary,
        borderColor: themeColors.border.default,
        borderWidth: 1,
        textStyle: {
          color: themeColors.text.primary,
        },
      },
      grid: {
        left: '25%',
        right: '5%',
        bottom: '10%',
        top: '5%',
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: themeColors.text.secondary,
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            return value.toString();
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: themeColors.border.default,
            type: 'dashed',
          },
        },
        axisLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'category',
        data: data.names,
        axisLabel: {
          color: themeColors.text.primary,
          fontSize: 12,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          type: 'bar',
          data: data.values,
          itemStyle: {
            color: themeColors.primary.main,
            borderRadius: [0, 4, 4, 0],
          },
          barWidth: '60%',
          label: {
            show: true,
            position: 'right',
            color: themeColors.text.primary,
            fontSize: 11,
            formatter: (params: any) => {
              const value = params.value;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
              return value.toLocaleString();
            },
          },
        },
      ],
    };
  }, [topExercisesBarData, barChartMode]);

  const handleExercisePress = (exerciseId: number) => {
    navigation.navigate('ExerciseDetail', { exerciseId });
  };

  // Initialize category pie chart
  useEffect(() => {
    let chart: any;
    if (categoryPieChartRef.current && categoryPieChartOption) {
      chart = echarts.init(categoryPieChartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: CHART_HEIGHT,
      });
      chart.setOption(categoryPieChartOption);
    }
    return () => {
      chart?.dispose();
    };
  }, [categoryPieChartOption, chartWidth]);

  // Initialize top exercises bar chart
  useEffect(() => {
    let chart: any;
    if (topExercisesBarChartRef.current && topExercisesBarChartOption) {
      chart = echarts.init(topExercisesBarChartRef.current, 'dark', {
        renderer: 'svg',
        width: chartWidth,
        height: CHART_HEIGHT,
      });
      chart.setOption(topExercisesBarChartOption);
    }
    return () => {
      chart?.dispose();
    };
  }, [topExercisesBarChartOption, chartWidth]);

  if (!exerciseStats) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No exercise data available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Stats */}
      {aggregateStats && (
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <MaterialIcons
              name="emoji-events"
              size={28}
              color={themeColors.primary.main}
              style={styles.heroIcon}
            />
            <Text style={styles.heroValue}>
              {Math.round(aggregateStats.totalVolume).toLocaleString()}
            </Text>
            <Text style={styles.heroLabel}>Total Volume (lbs)</Text>
          </View>
          <View style={styles.heroRow}>
            <View style={[styles.heroCard, styles.heroCardSmall]}>
              <MaterialIcons
                name="layers"
                size={22}
                color={themeColors.text.secondary}
                style={styles.heroIcon}
              />
              <Text style={styles.heroValueSmall}>{aggregateStats.totalSets.toLocaleString()}</Text>
              <Text style={styles.heroLabel}>Total Sets</Text>
            </View>
            <View style={[styles.heroCard, styles.heroCardSmall]}>
              <MaterialIcons
                name="fitness-center"
                size={22}
                color={themeColors.text.secondary}
                style={styles.heroIcon}
              />
              <Text style={styles.heroValueSmall}>{aggregateStats.uniqueExercises}</Text>
              <Text style={styles.heroLabel}>Exercises</Text>
            </View>
          </View>
        </View>
      )}

      {/* Category Distribution Pie Chart */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Distribution</Text>
          <View style={styles.toggleContainer}>
            <SegmentedControl
              segments={[
                { label: 'Volume', value: 'volume' },
                { label: 'Sets', value: 'sets' },
              ]}
              value={pieChartMode}
              onChange={(value) => setPieChartMode(value as 'volume' | 'sets')}
              alignSelf={true}
              containerStyle={{ marginBottom: spacing.md }}
            />
          </View>
          <View style={styles.chartCard}>
            {categoryPieChartOption ? (
              <View style={styles.chartContainer}>
                <SvgChart ref={categoryPieChartRef} />
              </View>
            ) : (
              <Text style={styles.emptyChartText}>No data available</Text>
            )}
          </View>
        </View>
      )}

      {/* Top Exercises Bar Chart */}
      {(topExercisesBarData.volume.names.length > 0 || topExercisesBarData.sets.names.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Exercises</Text>
          <View style={styles.toggleContainer}>
            <SegmentedControl
              segments={[
                { label: 'Volume', value: 'volume' },
                { label: 'Sets', value: 'sets' },
              ]}
              value={barChartMode}
              onChange={(value) => setBarChartMode(value as 'volume' | 'sets')}
              alignSelf={true}
              containerStyle={{ marginBottom: spacing.md }}
            />
          </View>
          <View style={styles.chartCard}>
            {topExercisesBarChartOption ? (
              <View style={styles.chartContainer}>
                <SvgChart ref={topExercisesBarChartRef} />
              </View>
            ) : (
              <Text style={styles.emptyChartText}>No data available</Text>
            )}
          </View>
        </View>
      )}

      {/* Record Holders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Record Holders</Text>
        <View style={styles.recordsGrid}>
          {recordHolders.map((record, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recordCard}
              onPress={() => record.exercise && handleExercisePress(record.exercise.id)}
              activeOpacity={0.7}
            >
              <View style={styles.recordHeader}>
                <MaterialIcons
                  name={record.icon as any}
                  size={20}
                  color={themeColors.primary.main}
                />
                <Text style={styles.recordTitle}>{record.title}</Text>
              </View>
              <Text style={styles.recordValue}>{record.value}</Text>
              <Text style={styles.recordSubtitle} numberOfLines={1}>
                {record.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.categoryList}>
            {categoryBreakdown.map((cat, index) => (
              <View key={cat.category} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.category}</Text>
                  <Text style={styles.categoryMeta}>
                    {cat.count} exercises • {cat.sets} sets
                  </Text>
                </View>
                <View style={styles.categoryVolume}>
                  <Text style={styles.categoryVolumeValue}>
                    {Math.round(cat.volume).toLocaleString()}
                  </Text>
                  <Text style={styles.categoryVolumeLabel}>volume</Text>
                </View>
              </View>
            ))}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
  },

  // Hero Section
  heroSection: {
    marginBottom: spacing.xl,
  },
  heroCard: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroCardSmall: {
    flex: 1,
  },
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroValue: {
    color: themeColors.primary.main,
    fontSize: 36,
    fontWeight: '800',
  },
  heroValueSmall: {
    color: themeColors.text.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  heroLabel: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  heroIcon: {
    marginBottom: spacing.xs,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  // Record Cards
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recordCard: {
    width: '48%',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  recordTitle: {
    color: themeColors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  recordValue: {
    color: themeColors.text.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  recordSubtitle: {
    color: themeColors.text.secondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },

  // Category List
  categoryList: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  categoryMeta: {
    color: themeColors.text.secondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  categoryVolume: {
    alignItems: 'flex-end',
  },
  categoryVolumeValue: {
    color: themeColors.primary.main,
    fontSize: 16,
    fontWeight: '700',
  },
  categoryVolumeLabel: {
    color: themeColors.text.secondary,
    fontSize: 11,
  },

  // Exercise List
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseMeta: {
    color: themeColors.text.secondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseStat: {
    color: themeColors.text.secondary,
    fontSize: 14,
  },

  // Chart Styles
  toggleContainer: {
    marginBottom: spacing.md,
  },
  chartCard: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
    overflow: 'hidden',
  },
  chartContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});

