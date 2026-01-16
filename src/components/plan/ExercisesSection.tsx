import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { BottomDrawer } from '../BottomDrawer';
import { exercisesService } from '../../services/exercisesService';
import { ExerciseListItem, ExercisesByCategory } from '../../types/plan';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export interface ExercisesSectionRef {
  openCreateDialog: () => void;
}

type SortColumn = 'name' | 'category' | 'highestWeight';
type SortDirection = 'asc' | 'desc';

const EXERCISE_CATEGORIES = ['BACK', 'BICEPS', 'TRICEPS', 'CHEST', 'SHOULDERS', 'HAMSTRINGS', 'QUADS', 'CALVES'];

export const ExercisesSection = forwardRef<ExercisesSectionRef>((props, ref) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [exercises, setExercises] = useState<ExercisesByCategory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: '',
  });
  const [creating, setCreating] = useState(false);
  const [sortBy, setSortBy] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useImperativeHandle(ref, () => ({
    openCreateDialog: () => setModalVisible(true),
  }));

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await exercisesService.getExercises();
      setExercises(data);
    } catch (err: any) {
      console.error('Failed to fetch exercises', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExercise = async () => {
    if (!newExercise.name.trim() || !newExercise.category) {
      return;
    }

    try {
      setCreating(true);
      await exercisesService.createExercise({
        name: newExercise.name.trim(),
        category: newExercise.category,
      });
      // Refresh exercises list
      const data = await exercisesService.getExercises();
      setExercises(data);
      setModalVisible(false);
      setNewExercise({ name: '', category: '' });
    } catch (err: any) {
      console.error('Failed to create exercise', err);
      setError(err.message || 'Failed to create exercise');
    } finally {
      setCreating(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const getSortedExercises = (exerciseList: ExerciseListItem[]) => {
    return [...exerciseList].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortBy) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'category':
          return direction * a.category.localeCompare(b.category);
        case 'highestWeight':
          return direction * (a.highestWeight - b.highestWeight);
        default:
          return 0;
      }
    });
  };

  const categories = useMemo(() => ['ALL', ...Object.keys(exercises).sort()], [exercises]);
  
  const filteredExercises = useMemo(() => {
    const exerciseList = selectedCategory === 'ALL' 
      ? Object.values(exercises).flat()
      : exercises[selectedCategory] || [];
    return getSortedExercises(exerciseList);
  }, [exercises, selectedCategory, sortBy, sortDirection]);

  const formatCategoryName = (category: string) => {
    return category.charAt(0) + category.slice(1).toLowerCase();
  };

  const renderExerciseRow = ({ item }: { item: ExerciseListItem }) => {
    return (
      <TouchableOpacity
        style={styles.exerciseRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
      >
        <View style={styles.exerciseRowContent}>
          <View style={styles.exerciseRowMain}>
            <Text style={styles.exerciseName}>{item.name}</Text>
            <Text style={styles.exerciseCategory}>
              {formatCategoryName(item.category)}
            </Text>
          </View>
          <View style={styles.exerciseRowRight}>
            <Text style={styles.exerciseWeight}>
              {item.highestWeight > 0 ? `${item.highestWeight} lbs` : '-'}
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={themeColors.text.muted}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSortHeader = () => {
    const SortButton = ({ column, label }: { column: SortColumn; label: string }) => {
      const isActive = sortBy === column;
      return (
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => handleSort(column)}
        >
          <Text style={[styles.sortButtonText, isActive && styles.sortButtonTextActive]}>
            {label}
          </Text>
          {isActive && (
            <MaterialIcons
              name={sortDirection === 'asc' ? 'arrow-upward' : 'arrow-downward'}
              size={16}
              color={themeColors.primary.main}
            />
          )}
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.sortHeader}>
        <SortButton column="name" label="Name" />
        <SortButton column="category" label="Category" />
        <SortButton column="highestWeight" label="Weight" />
        <View style={styles.sortButton} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  if (error && Object.keys(exercises).length === 0) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchExercises} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categorySegments = categories.map(cat => ({
    label: formatCategoryName(cat),
    value: cat,
  }));

  return (
    <View style={styles.container}>
      {/* Category Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {categorySegments.map((segment) => (
            <TouchableOpacity
              key={segment.value}
              style={[
                styles.categoryTab,
                selectedCategory === segment.value && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(segment.value)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === segment.value && styles.categoryTabTextActive,
                ]}
              >
                {segment.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Header */}
      {filteredExercises.length > 0 && renderSortHeader()}

      {/* Exercises List */}
      <FlatList
        data={filteredExercises}
        renderItem={renderExerciseRow}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No exercises in {selectedCategory === 'ALL' ? 'any category' : formatCategoryName(selectedCategory).toLowerCase()}
            </Text>
            <Text style={styles.emptySubtext}>
              Create your first exercise to get started
            </Text>
          </View>
        }
      />

      {/* Create Exercise Drawer */}
      <BottomDrawer
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Create New Exercise"
      >
        <View style={styles.drawerContent}>
          <Text style={styles.inputLabel}>Exercise Name</Text>
          <TextInput
            style={styles.textInput}
            value={newExercise.name}
            onChangeText={(text) => setNewExercise(prev => ({ ...prev, name: text }))}
            placeholder="Enter exercise name"
            placeholderTextColor={themeColors.text.muted}
            autoFocus
          />

          <Text style={styles.inputLabel}>Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setCategoryPickerVisible(true)}
          >
            <Text style={newExercise.category ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
              {newExercise.category ? formatCategoryName(newExercise.category) : 'Select category'}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={themeColors.text.secondary}
            />
          </TouchableOpacity>

          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={[styles.drawerButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.drawerButton,
                styles.createButton,
                (!newExercise.name.trim() || !newExercise.category || creating) && styles.createButtonDisabled,
              ]}
              onPress={handleCreateExercise}
              disabled={!newExercise.name.trim() || !newExercise.category || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color={themeColors.text.primary} />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomDrawer>

      {/* Category Picker Drawer */}
      <BottomDrawer
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        title="Select Category"
        items={EXERCISE_CATEGORIES.map(category => ({
          label: formatCategoryName(category),
          onPress: () => setNewExercise(prev => ({ ...prev, category })),
        }))}
      />
    </View>
  );
});

ExercisesSection.displayName = 'ExercisesSection';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  tabScrollContent: {
    gap: spacing.xs,
  },
  categoryTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginRight: spacing.xs,
  },
  categoryTabActive: {
    backgroundColor: themeColors.overlay.medium,
    borderColor: themeColors.primary.main,
  },
  categoryTabText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: themeColors.primary.main,
    fontWeight: '600',
  },
  sortHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sortButtonText: {
    color: themeColors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: themeColors.primary.main,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
  },
  exerciseRow: {
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  exerciseRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  exerciseRowMain: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.xs,
  },
  exerciseCategory: {
    fontSize: 14,
    color: themeColors.text.secondary,
  },
  exerciseRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseWeight: {
    fontSize: 14,
    color: themeColors.text.secondary,
    minWidth: 60,
    textAlign: 'right',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
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
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  retryText: {
    color: themeColors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    color: themeColors.text.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  drawerContent: {
    padding: spacing.md,
  },
  inputLabel: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: themeColors.text.primary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  pickerButtonText: {
    color: themeColors.text.primary,
    fontSize: 16,
  },
  pickerButtonPlaceholder: {
    color: themeColors.text.muted,
    fontSize: 16,
  },
  drawerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  drawerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  cancelButtonText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: themeColors.primary.main,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

