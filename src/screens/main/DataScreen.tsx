import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  MesocycleSelect,
  VolumeSetRadarChart,
  MuscleGroupBarChart,
  VolumeSetsToggle,
  DisplayMode,
} from '../../components/data';
import { dashboardService, MuscleGroupData } from '../../services/dashboardService';
import { themeColors, spacing } from '../../theme/colors';

export const DataScreen: React.FC = () => {
  // State
  const [selectedMesocycleId, setSelectedMesocycleId] = useState<number | 'all'>('all');
  const [volumeData, setVolumeData] = useState<MuscleGroupData | null>(null);
  const [setData, setSetData] = useState<MuscleGroupData | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('volume');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get unique muscle groups from data
  const muscleGroups = useMemo(() => {
    const groups = new Set<string>();
    if (volumeData) Object.keys(volumeData).forEach(g => groups.add(g));
    if (setData) Object.keys(setData).forEach(g => groups.add(g));
    return Array.from(groups).sort();
  }, [volumeData, setData]);

  // Fetch data function
  const fetchData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      const mesocycleId = selectedMesocycleId === 'all' ? undefined : selectedMesocycleId;
      const { volumeData: vData, setData: sData } = await dashboardService.fetchDashboardData(mesocycleId);
      
      setVolumeData(vData);
      setSetData(sData);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data when mesocycle selection changes
  useEffect(() => {
    fetchData();
  }, [selectedMesocycleId]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // Handle mesocycle change
  const handleMesocycleChange = (value: number | 'all') => {
    setSelectedMesocycleId(value);
  };

  // Handle display mode change
  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
  };

  // Loading state (initial load)
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  // Error state (full screen)
  if (error && !volumeData && !setData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={() => fetchData()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  const radarTitle = selectedMesocycleId === 'all' 
    ? 'All Time Volume & Sets' 
    : 'Mesocycle Volume & Sets';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary.main}
          colors={[themeColors.primary.main]}
        />
      }
    >
      {/* Mesocycle Filter */}
      <MesocycleSelect
        value={selectedMesocycleId}
        onChange={handleMesocycleChange}
        showAllTime
      />

      {/* Radar Chart */}
      <VolumeSetRadarChart
        volumeData={volumeData}
        setData={setData}
        title={radarTitle}
        loading={loading}
        error={error}
      />

      {/* Volume/Sets Toggle */}
      <View style={styles.toggleContainer}>
        <VolumeSetsToggle
          value={displayMode}
          onChange={handleDisplayModeChange}
        />
      </View>

      {/* Bar Charts per Muscle Group */}
      {muscleGroups.map(muscleGroup => (
        <MuscleGroupBarChart
          key={muscleGroup}
          muscleGroup={muscleGroup}
          volumeInstances={volumeData?.[muscleGroup] || []}
          setInstances={setData?.[muscleGroup] || []}
          mode={displayMode}
        />
      ))}

      {/* Empty State */}
      {muscleGroups.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No data available for the selected period.
          </Text>
          <Text style={styles.emptySubtext}>
            Complete some workouts to see your muscle group analytics.
          </Text>
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
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    color: themeColors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleContainer: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
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
});
