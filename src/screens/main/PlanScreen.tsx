import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SegmentedControl } from '../../components/data';
import {
  PlansSection,
  PlansSectionRef,
  MesocyclesSection,
  MesocyclesSectionRef,
  ExercisesSection,
  ExercisesSectionRef,
} from '../../components/plan';
import { themeColors, spacing } from '../../theme/colors';

type PlanTab = 'plans' | 'mesocycles' | 'exercises';

export const PlanScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlanTab>('plans');
  const plansSectionRef = useRef<PlansSectionRef>(null);
  const mesocyclesSectionRef = useRef<MesocyclesSectionRef>(null);
  const exercisesSectionRef = useRef<ExercisesSectionRef>(null);

  const handleCreateAction = () => {
    switch (activeTab) {
      case 'plans':
        plansSectionRef.current?.openCreateDialog();
        break;
      case 'mesocycles':
        mesocyclesSectionRef.current?.openCreateDialog();
        break;
      case 'exercises':
        exercisesSectionRef.current?.openCreateDialog();
        break;
    }
  };

  const getCreateButtonLabel = () => {
    switch (activeTab) {
      case 'plans':
        return 'New Plan';
      case 'mesocycles':
        return 'New Mesocycle';
      case 'exercises':
        return 'New Exercise';
      default:
        return 'New';
    }
  };

  const tabs = [
    { label: 'Plans', value: 'plans' },
    { label: 'Mesocycles', value: 'mesocycles' },
    { label: 'Exercises', value: 'exercises' },
  ];

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          segments={tabs}
          value={activeTab}
          onChange={(value) => setActiveTab(value as PlanTab)}
        />
      </View>

      {/* Create Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateAction}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="add"
            size={20}
            color={themeColors.text.primary}
          />
          <Text style={styles.createButtonText}>{getCreateButtonLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'plans' && <PlansSection ref={plansSectionRef} />}
      {activeTab === 'mesocycles' && <MesocyclesSection ref={mesocyclesSectionRef} />}
      {activeTab === 'exercises' && <ExercisesSection ref={exercisesSectionRef} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  tabContainer: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  createButtonText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

