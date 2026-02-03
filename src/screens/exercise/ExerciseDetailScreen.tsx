import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { dashboardService } from '../../services/dashboardService';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ExerciseDetail } from '../../types/exercise';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { SegmentedControl } from '../../components/data';
import { ExerciseOverviewTab } from '../../components/exercise/ExerciseOverviewTab';
import { ExerciseHistoryTab } from '../../components/exercise/ExerciseHistoryTab';
import { ExerciseChartsTab } from '../../components/exercise/ExerciseChartsTab';
import { EditExerciseModal } from '../../components/exercise/EditExerciseModal';

type ExerciseDetailScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseDetail'>;
type ExerciseDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExerciseDetail'>;

type TabType = 'overview' | 'history' | 'charts';

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'History', value: 'history' },
  { label: 'Charts', value: 'charts' },
];

export const ExerciseDetailScreen: React.FC = () => {
  const route = useRoute<ExerciseDetailScreenRouteProp>();
  const navigation = useNavigation<ExerciseDetailScreenNavigationProp>();
  const { exerciseId } = route.params;

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    fetchExerciseDetail();
  }, [exerciseId]);

  const fetchExerciseDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getExerciseDetail(exerciseId);
      setExercise(data);
    } catch (err: any) {
      console.error('Failed to fetch exercise detail', err);
      setError(err.message || 'Failed to load exercise');
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseUpdated = async () => {
    await fetchExerciseDetail();
    setEditModalVisible(false);
  };

  const handleExerciseDeleted = () => {
    setEditModalVisible(false);
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
        </View>
      </View>
    );
  }

  if (error || !exercise) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Exercise not found'}</Text>
          <TouchableOpacity onPress={fetchExerciseDetail} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Content Header */}
      <View style={styles.contentHeader}>
        <View style={styles.contentHeaderInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.headerMeta}>
            <View style={styles.categoryChip}>
              <MaterialIcons name="fitness-center" size={16} color={themeColors.text.secondary} />
              <Text style={styles.categoryText}>{exercise.category}</Text>
            </View>
          </View>
        </View>
        {exercise.userId !== null && (
          <TouchableOpacity
            onPress={() => setEditModalVisible(true)}
            style={styles.editButton}
          >
            <MaterialIcons name="edit" size={24} color={themeColors.primary.main} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          segments={tabs}
          value={activeTab}
          onChange={(value) => setActiveTab(value as TabType)}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && <ExerciseOverviewTab exercise={exercise} />}
        {activeTab === 'history' && <ExerciseHistoryTab history={exercise.history} />}
        {activeTab === 'charts' && <ExerciseChartsTab exercise={exercise} />}
      </View>

      {/* Edit Modal */}
      <EditExerciseModal
        visible={editModalVisible}
        exercise={exercise}
        onClose={() => setEditModalVisible(false)}
        onUpdated={handleExerciseUpdated}
        onDeleted={handleExerciseDeleted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  contentHeaderInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginBottom: spacing.sm,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: themeColors.background.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  categoryText: {
    color: themeColors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  tabContainer: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: themeColors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

