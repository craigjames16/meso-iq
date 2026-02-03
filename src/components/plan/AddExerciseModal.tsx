import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { ExerciseListItem } from '../../types/plan';
import { BottomDrawer } from '../BottomDrawer';

const EXERCISE_CATEGORIES = ['ALL', 'BACK', 'BICEPS', 'TRICEPS', 'CHEST', 'SHOULDERS', 'HAMSTRINGS', 'QUADS', 'CALVES'];
const CREATE_EXERCISE_CATEGORIES = ['BACK', 'BICEPS', 'TRICEPS', 'CHEST', 'SHOULDERS', 'HAMSTRINGS', 'QUADS', 'CALVES'];

type TabType = 'browse' | 'create';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  exercises: ExerciseListItem[];
  onSelectExercises: (exercises: ExerciseListItem[]) => void;
  onCreateExercise: (name: string, category: string) => Promise<void>;
  creating?: boolean;
  autoSelectExerciseId?: number | null;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  exercises,
  onSelectExercises,
  onCreateExercise,
  creating = false,
  autoSelectExerciseId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [createCategory, setCreateCategory] = useState<string>('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<number>>(new Set());

  const filteredExercises = useMemo(() => {
    let filtered = exercises;

    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter((ex) => ex.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((ex) =>
        ex.name.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, selectedCategory, searchQuery]);

  // Auto-select exercise when modal opens with autoSelectExerciseId
  useEffect(() => {
    if (autoSelectExerciseId && activeTab === 'browse') {
      const exerciseToSelect = exercises.find((ex) => ex.id === autoSelectExerciseId);
      if (exerciseToSelect) {
        // Small delay to ensure modal is fully rendered
        setTimeout(() => {
          onSelectExercises([exerciseToSelect]);
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectExerciseId, activeTab]);

  // Reset form when switching tabs or closing
  useEffect(() => {
    if (!visible) {
      setActiveTab('browse');
      setExerciseName('');
      setCreateCategory('');
      setSearchQuery('');
      setSelectedCategory('ALL');
      setSelectedExerciseIds(new Set());
    }
  }, [visible]);

  const handleCreateExercise = async () => {
    if (!exerciseName.trim()) {
      Alert.alert('Error', 'Please enter an exercise name');
      return;
    }
    if (!createCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      await onCreateExercise(exerciseName.trim(), createCategory);
      setExerciseName('');
      setCreateCategory('');
      // Switch to browse tab after creation
      setActiveTab('browse');
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const formatCategoryName = (category: string) => {
    if (category === 'ALL') return 'All Categories';
    return category.charAt(0) + category.slice(1).toLowerCase();
  };

  const handleExerciseToggle = (exercise: ExerciseListItem) => {
    setSelectedExerciseIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exercise.id)) {
        newSet.delete(exercise.id);
      } else {
        newSet.add(exercise.id);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    if (selectedExerciseIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one exercise');
      return;
    }

    const selectedExercises = exercises.filter((ex) => selectedExerciseIds.has(ex.id));
    onSelectExercises(selectedExercises);
    onClose();
  };

  const renderExerciseItem = ({ item }: { item: ExerciseListItem }) => {
    const isSelected = selectedExerciseIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.exerciseItem,
          isSelected && styles.exerciseItemSelected,
        ]}
        onPress={() => handleExerciseToggle(item)}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.exerciseCategory}>{formatCategoryName(item.category)}</Text>
        </View>
        <MaterialIcons
          name={isSelected ? "check-circle" : "radio-button-unchecked"}
          size={24}
          color={isSelected ? themeColors.primary.main : themeColors.text.muted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      title={activeTab === 'browse' ? 'Add Exercise' : 'Create Exercise'}
      height="80%"
      disableScrollView={activeTab === 'browse'}
      disableKeyboardAvoidance={true}
    >
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
          onPress={() => setActiveTab('browse')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.tabTextActive]}>
            Browse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content Container */}
      <View style={styles.tabContentContainer}>
        {/* Browse Tab Content */}
        {activeTab === 'browse' && (
          <>
            {/* Fixed Search Input */}
            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color={themeColors.text.muted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor={themeColors.text.muted}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name="clear"
                    size={20}
                    color={themeColors.text.muted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Fixed Category Pills */}
            <View style={[styles.categoryPillsContainer, styles.categoryPillsContainerBrowse]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsScrollContent}
              >
                {EXERCISE_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryPill,
                      selectedCategory === category && styles.categoryPillActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedCategory === category && styles.categoryPillTextActive,
                      ]}
                    >
                      {formatCategoryName(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Exercise List - Only exercises scroll */}
            <FlatList
              data={filteredExercises}
              renderItem={renderExerciseItem}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery.trim()
                      ? 'No exercises found'
                      : `No exercises in ${formatCategoryName(selectedCategory).toLowerCase()}`}
                  </Text>
                </View>
              }
            />

            {/* Add Selected Button - Pinned to Bottom */}
            <View style={styles.addSelectedContainer}>
              <TouchableOpacity
                style={[
                  styles.addSelectedButton,
                  selectedExerciseIds.size === 0 && styles.addSelectedButtonDisabled,
                ]}
                onPress={handleAddSelected}
                disabled={selectedExerciseIds.size === 0}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="add-circle"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.addSelectedButtonText}>
                  {selectedExerciseIds.size === 0
                    ? 'Add Exercise'
                    : `Add ${selectedExerciseIds.size} Exercise${selectedExerciseIds.size > 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Create Tab Content */}
        {activeTab === 'create' && (
          <ScrollView 
            style={styles.createContent}
            contentContainerStyle={styles.createContentContainer}
            showsVerticalScrollIndicator={false}
          >
          {/* Exercise Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Exercise Name</Text>
            <TextInput
              style={styles.input}
              value={exerciseName}
              onChangeText={setExerciseName}
              placeholder="Enter exercise name"
              placeholderTextColor={themeColors.text.muted}
              autoCapitalize="words"
              autoFocus
            />
          </View>

          {/* Category Pills */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryPillsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsScrollContent}
              >
                {CREATE_EXERCISE_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryPill,
                      createCategory === category && styles.categoryPillActive,
                    ]}
                    onPress={() => setCreateCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        createCategory === category && styles.categoryPillTextActive,
                      ]}
                    >
                      {formatCategoryName(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createSubmitButton,
              (!exerciseName.trim() || !createCategory || creating) && styles.createSubmitButtonDisabled,
            ]}
            onPress={handleCreateExercise}
            disabled={!exerciseName.trim() || !createCategory || creating}
            activeOpacity={0.7}
          >
            {creating ? (
              <ActivityIndicator size="small" color={themeColors.text.primary} />
            ) : (
              <>
                <MaterialIcons
                  name="add-circle-outline"
                  size={20}
                  color={themeColors.text.primary}
                />
                <Text style={styles.createSubmitButtonText}>Create & Add</Text>
              </>
            )}
          </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </BottomDrawer>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexShrink: 0, // Prevent shrinking
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: themeColors.text.primary,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
  categoryPillsContainer: {
    marginBottom: spacing.md,
  },
  categoryPillsContainerBrowse: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  categoryPillsScrollContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginRight: spacing.sm,
  },
  categoryPillActive: {
    backgroundColor: themeColors.primary.main,
    borderColor: themeColors.primary.main,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.text.secondary,
  },
  categoryPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseItemSelected: {
    backgroundColor: themeColors.background.elevated,
    borderColor: themeColors.primary.main,
    borderWidth: 2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.primary,
    marginBottom: spacing.xs,
  },
  exerciseCategory: {
    fontSize: 12,
    color: themeColors.text.secondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: themeColors.text.muted,
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  createButtonText: {
    color: themeColors.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: themeColors.primary.main,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text.secondary,
  },
  tabTextActive: {
    color: themeColors.primary.main,
  },
  tabContentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  createContent: {
    flex: 1,
  },
  createContentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: themeColors.text.primary,
    fontSize: 16,
  },
  createSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  createSubmitButtonDisabled: {
    opacity: 0.5,
  },
  createSubmitButtonText: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  addSelectedContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border.default,
    backgroundColor: themeColors.background.secondary,
    // Ensure button stays at bottom, not scrollable
    flexShrink: 0,
  },
  addSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  addSelectedButtonDisabled: {
    backgroundColor: themeColors.background.surface,
    opacity: 0.5,
  },
  addSelectedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

