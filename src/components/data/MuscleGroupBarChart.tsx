import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
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

interface MuscleGroupBarChartProps {
  muscleGroup: string;
  volumeInstances: any[];
  setInstances: any[];
  mode: 'volume' | 'sets';
}

const CHART_HEIGHT = 400;

export const MuscleGroupBarChart: React.FC<MuscleGroupBarChartProps> = ({
  muscleGroup,
  volumeInstances,
  setInstances,
  mode,
}) => {
  const chartRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.md * 4; // Account for container padding

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; volume: number; sets: number }>();

    // Process Volume
    volumeInstances.forEach(inst => {
      const [id, data] = Object.entries(inst)[0] as [string, { volume: number; date: string }];
      if (!dataMap.has(id)) {
        dataMap.set(id, { date: data.date, volume: 0, sets: 0 });
      }
      dataMap.get(id)!.volume = data.volume;
    });

    // Process Sets
    setInstances.forEach(inst => {
      const [id, data] = Object.entries(inst)[0] as [string, { count: number; date: string }];
      if (!dataMap.has(id)) {
        dataMap.set(id, { date: data.date, volume: 0, sets: 0 });
      }
      dataMap.get(id)!.sets = data.count;
    });

    // Sort by date
    const sortedData = Array.from(dataMap.entries())
      .map(([id, data]) => ({ instanceId: id, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate rolling averages (last 3)
    return sortedData.map((item, index) => {
      // Rolling Volume (last 3)
      const startIdx = Math.max(0, index - 10);
      const relevantWindow = sortedData.slice(startIdx, index + 1);
      
      const rollingVolume = relevantWindow.reduce((sum, curr) => sum + curr.volume, 0) / relevantWindow.length;
      const rollingSets = relevantWindow.reduce((sum, curr) => sum + curr.sets, 0) / relevantWindow.length;

      return {
        ...item,
        shortDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rollingVolume,
        rollingSets
      };
    });
  }, [volumeInstances, setInstances]);

  const chartOption = useMemo(() => {
    if (chartData.length === 0) return null;

    const isVolume = mode === 'volume';
    const barData = chartData.map(d => isVolume ? d.volume : d.sets);
    const lineData = chartData.map(d => isVolume ? d.rollingVolume : d.rollingSets);
    const barColor = isVolume ? themeColors.chart.volume : themeColors.chart.sets;
    const lineColor = isVolume ? themeColors.chart.sets : themeColors.chart.volume;
    const unit = isVolume ? 'lbs' : '';

    return {
      backgroundColor: 'transparent',
      title: {
        text: ''
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        data: ['Daily', 'Rolling Avg'],
        textStyle: {
          color: themeColors.text.primary
        },
        itemGap: 20,
        left: 'center',
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '5%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: true,
          data: chartData.map(d => d.shortDate),
          axisLabel: {
            color: themeColors.text.primary
          },
          splitLine: {
            show: false
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          splitNumber: 5,
          axisLabel: {
            color: themeColors.text.primary,
            formatter: `{value} ${unit}`
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: 'Daily',
          type: 'bar',
          data: barData,
          itemStyle: {
            color: barColor,
            opacity: 0.6
          }
        },
        {
          name: 'Rolling Avg',
          type: 'line',
          smooth: true,
          data: lineData,
          itemStyle: {
            color: lineColor
          },
          lineStyle: {
            width: 3
          }
        }
      ]
    };
  }, [chartData, mode]);

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

  if (chartData.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{muscleGroup}</Text>
      </View>
      <View style={styles.chartContainer}>
        <SvgChart ref={chartRef} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 8,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainer: {
    width: '100%',
    height: CHART_HEIGHT,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
});
