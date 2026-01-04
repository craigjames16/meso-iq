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
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { ExerciseListItem } from '../../types/plan';
import { StandardModal } from '../StandardModal';

const EXERCISE_CATEGORIES = ['ALL', 'BACK', 'BICEPS', 'TRICEPS', 'CHEST', 'SHOULDERS', 'HAMSTRINGS', 'QUADS', 'CALVES'];
const CREATE_EXERCISE_CATEGORIES = ['BACK', 'BICEPS', 'TRICEPS', 'CHEST', 'SHOULDERS', 'HAMSTRINGS', 'QUADS', 'CALVES'];

type TabType = 'browse' | 'create';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  exercises: ExerciseListItem[];
  onSelectExercise: (exercise: ExerciseListItem) => void;
  onCreateExercise: (name: string, category: string) => Promise<void>;
  creating?: boolean;
  autoSelectExerciseId?: number | null;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  onClose,
  exercises,
  onSelectExercise,
  onCreateExercise,
  creating = false,
  autoSelectExerciseId,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [createCategory, setCreateCategory] = useState<string>('');

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
          onSelectExercise(exerciseToSelect);
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

  const renderExerciseItem = ({ item }: { item: ExerciseListItem }) => {
    return (
      <TouchableOpacity
        style={styles.exerciseItem}
        onPress={() => {
          onSelectExercise(item);
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.exerciseCategory}>{formatCategoryName(item.category)}</Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={themeColors.text.muted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <StandardModal
      visible={visible}
      onClose={onClose}
      title={activeTab === 'browse' ? 'Add Exercise' : 'Create Exercise'}
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
          <View style={styles.browseContent}>
            {/* Search Input */}
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

          {/* Category Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Category</Text>
            <View style={styles.pickerWrapper}>
              {Platform.OS === 'android' ? (
                <View style={styles.pickerAndroidWrapper}>
                  <Text style={styles.pickerSelectedText}>
                    {formatCategoryName(selectedCategory)}
                  </Text>
                  <Picker
                    selectedValue={selectedCategory}
                    onValueChange={setSelectedCategory}
                    style={styles.pickerAndroid}
                    dropdownIconColor={themeColors.text.primary}
                    mode="dropdown"
                  >
                    {EXERCISE_CATEGORIES.map((category) => (
                      <Picker.Item
                        key={category}
                        label={formatCategoryName(category)}
                        value={category}
                        color="#ffffff"
                      />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Picker
                  selectedValue={selectedCategory}
                  onValueChange={setSelectedCategory}
                  style={styles.picker}
                  dropdownIconColor={themeColors.text.primary}
                  itemStyle={styles.pickerItemStyle}
                >
                  {EXERCISE_CATEGORIES.map((category) => (
                    <Picker.Item
                      key={category}
                      label={formatCategoryName(category)}
                      value={category}
                      color={themeColors.text.primary}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          {/* Exercise List */}
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
          </View>
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

          {/* Category Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.pickerWrapper}>
              {Platform.OS === 'android' ? (
                <View style={styles.pickerAndroidWrapper}>
                  <Text style={[styles.pickerSelectedText, !createCategory && styles.pickerSelectedTextPlaceholder]}>
                    {createCategory ? formatCategoryName(createCategory) : 'Select category'}
                  </Text>
                  <Picker
                    selectedValue={createCategory}
                    onValueChange={setCreateCategory}
                    style={styles.pickerAndroid}
                    dropdownIconColor={themeColors.text.primary}
                    mode="dropdown"
                  >
                    <Picker.Item
                      label="Select category"
                      value=""
                      color="#999999"
                    />
                    {CREATE_EXERCISE_CATEGORIES.map((cat) => (
                      <Picker.Item
                        key={cat}
                        label={formatCategoryName(cat)}
                        value={cat}
                        color="#ffffff"
                      />
                    ))}
                  </Picker>
                </View>
              ) : (
                <Picker
                  selectedValue={createCategory}
                  onValueChange={setCreateCategory}
                  style={styles.picker}
                  dropdownIconColor={themeColors.text.primary}
                  itemStyle={styles.pickerItemStyle}
                >
                  <Picker.Item
                    label="Select category"
                    value=""
                    color={themeColors.text.muted}
                  />
                  {CREATE_EXERCISE_CATEGORIES.map((cat) => (
                    <Picker.Item
                      key={cat}
                      label={formatCategoryName(cat)}
                      value={cat}
                      color={themeColors.text.primary}
                    />
                  ))}
                </Picker>
              )}
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
    </StandardModal>
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  pickerContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.secondary,
    marginBottom: spacing.xs,
  },
  pickerWrapper: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    color: themeColors.text.primary,
    backgroundColor: 'transparent',
  },
  pickerItemStyle: {
    color: themeColors.text.primary,
  },
  pickerAndroidWrapper: {
    position: 'relative',
    width: '100%',
  },
  pickerSelectedText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    color: themeColors.text.primary,
    fontSize: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlignVertical: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  pickerSelectedTextPlaceholder: {
    color: themeColors.text.muted,
  },
  pickerAndroid: {
    opacity: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  list: {
    flex: 1,
    marginTop: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
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
  },
  browseContent: {
    flex: 1,
  },
  createContent: {
    flex: 1,
  },
  createContentContainer: {
    padding: spacing.md,
    flexGrow: 1,
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
});

