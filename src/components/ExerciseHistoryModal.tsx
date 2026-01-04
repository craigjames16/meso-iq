import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
    TooltipComponent,
    GridComponent,
} from 'echarts/components';
import { themeColors, borderRadius, spacing } from '../theme/colors';

// Register echarts components
echarts.use([
    TooltipComponent,
    GridComponent,
    SVGRenderer,
    LineChart,
]);

export interface ExerciseSet {
    weight: number;
    reps: number;
    setNumber: number;
}

export interface HistoryInstance {
    workoutInstanceId: number | string;
    volume: number;
    completedAt: string | Date;
    sets: ExerciseSet[];
}

interface ExerciseHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    exerciseName: string;
    history: HistoryInstance[];
}

const CHART_HEIGHT = 200;

const ExerciseHistoryChart: React.FC<{ history: HistoryInstance[] }> = ({ history }) => {
    const chartRef = useRef<any>(null);
    const { width: screenWidth } = useWindowDimensions();
    const chartWidth = screenWidth - spacing.md * 4;

    const chartData = history
        .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
        .map(instance => ({
            date: new Date(instance.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            volume: instance.volume,
        }));

    const option = {
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
        grid: { left: 60, right: 20, bottom: 40, top: 20 },
        xAxis: {
            type: 'category',
            data: chartData.map(d => d.date),
            axisLabel: {
                fontSize: 10,
                color: themeColors.text.secondary,
                rotate: 45,
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
                data: chartData.map(d => d.volume),
                type: 'line',
                itemStyle: { color: themeColors.primary.main },
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
                            { offset: 0, color: 'rgba(136, 132, 216, 0.3)' },
                            { offset: 1, color: 'rgba(136, 132, 216, 0)' },
                        ],
                    },
                },
            },
        ],
    };

    useEffect(() => {
        let chart: any;
        if (chartRef.current && history.length > 0) {
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
    }, [history, chartWidth]);

    if (history.length === 0) {
        return (
            <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyText}>No history data to display</Text>
            </View>
        );
    }

    return (
        <View style={styles.chartContainer}>
            <SvgChart ref={chartRef} />
        </View>
    );
};

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
    visible,
    onClose,
    exerciseName,
    history,
}) => {
    const [activeTab, setActiveTab] = useState<'sets' | 'volume'>('sets');
    const { height: windowHeight } = useWindowDimensions();
    const modalHeight = windowHeight * 0.85;

    const sortedHistory = [...history].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { height: modalHeight }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{exerciseName} History</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color={themeColors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'sets' && styles.tabActive]}
                            onPress={() => setActiveTab('sets')}
                        >
                            <Text style={[styles.tabText, activeTab === 'sets' && styles.tabTextActive]}>
                                Sets
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'volume' && styles.tabActive]}
                            onPress={() => setActiveTab('volume')}
                        >
                            <Text style={[styles.tabText, activeTab === 'volume' && styles.tabTextActive]}>
                                Volume
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                        {activeTab === 'sets' ? (
                            <>
                                {sortedHistory.length === 0 ? (
                                    <Text style={styles.emptyText}>
                                        No previous history found for this exercise.
                                    </Text>
                                ) : (
                                    sortedHistory.map((instance, index) => {
                                        // Group sets by weight
                                        const setsByWeight = (instance.sets || []).reduce((acc, set) => {
                                            if (!acc[set.weight]) {
                                                acc[set.weight] = [];
                                            }
                                            acc[set.weight].push(set);
                                            return acc;
                                        }, {} as Record<number, ExerciseSet[]>);

                                        const setEntries = Object.entries(setsByWeight)
                                            .sort(([weightA], [weightB]) => Number(weightB) - Number(weightA));

                                        return (
                                            <View key={index} style={styles.historyItem}>
                                                <Text style={styles.historyDate}>
                                                    {formatDate(instance.completedAt)}
                                                </Text>
                                                <Text style={styles.historyVolume}>
                                                    Total Volume: {instance.volume.toLocaleString()} lbs
                                                </Text>
                                                {setEntries.length > 0 ? (
                                                    <View style={styles.setsContainer}>
                                                        {setEntries.map(([weight, sets]) => (
                                                            <View key={weight} style={styles.setGroup}>
                                                                <Text style={styles.setWeight}>{weight}lbs</Text>
                                                                <Text style={styles.setDetails}>
                                                                    {sets.length} set{sets.length > 1 ? 's' : ''}: {sets.map(set => set.reps).join(', ')} reps
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : (
                                                    <Text style={styles.emptyText}>No sets recorded</Text>
                                                )}
                                            </View>
                                        );
                                    })
                                )}
                            </>
                        ) : (
                            <ExerciseHistoryChart history={history} />
                        )}
                    </ScrollView>

                    {/* Close Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.closeButtonFull} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: themeColors.background.secondary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingBottom: 20,
        flexDirection: 'column',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border.default,
        flexShrink: 0,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: themeColors.text.primary,
        flex: 1,
    },
    closeButton: {
        padding: spacing.xs,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border.default,
        flexShrink: 0,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: themeColors.primary.main,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: themeColors.text.secondary,
    },
    tabTextActive: {
        color: themeColors.primary.main,
    },
    content: {
        flex: 1,
        flexShrink: 1,
    },
    contentContainer: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    historyItem: {
        backgroundColor: themeColors.background.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: themeColors.border.default,
    },
    historyDate: {
        fontSize: 16,
        fontWeight: '600',
        color: themeColors.primary.main,
        marginBottom: spacing.xs,
    },
    historyVolume: {
        fontSize: 14,
        color: themeColors.text.secondary,
        marginBottom: spacing.sm,
    },
    setsContainer: {
        gap: spacing.sm,
    },
    setGroup: {
        backgroundColor: 'rgba(136, 132, 216, 0.1)',
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(136, 132, 216, 0.3)',
    },
    setWeight: {
        fontSize: 14,
        fontWeight: '600',
        color: themeColors.text.primary,
        marginBottom: 2,
    },
    setDetails: {
        fontSize: 13,
        color: themeColors.text.secondary,
    },
    chartContainer: {
        height: CHART_HEIGHT,
        width: '100%',
    },
    emptyChartContainer: {
        height: CHART_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: themeColors.text.muted,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        flexShrink: 0,
    },
    closeButtonFull: {
        backgroundColor: themeColors.primary.main,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

