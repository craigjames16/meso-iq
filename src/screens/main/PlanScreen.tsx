import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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

// Module-level state for header button access
type PlanScreenRefs = {
  plansSectionRef: React.RefObject<PlansSectionRef> | null;
  mesocyclesSectionRef: React.RefObject<MesocyclesSectionRef> | null;
  exercisesSectionRef: React.RefObject<ExercisesSectionRef> | null;
};

type PlanScreenState = {
  activeTab: PlanTab;
  refs: PlanScreenRefs;
};

let planScreenState: PlanScreenState = {
  activeTab: 'plans',
  refs: {
    plansSectionRef: null,
    mesocyclesSectionRef: null,
    exercisesSectionRef: null,
  },
};

let stateUpdateListeners: Set<() => void> = new Set();

export const subscribeToPlanScreenState = (callback: () => void) => {
  stateUpdateListeners.add(callback);
  return () => {
    stateUpdateListeners.delete(callback);
  };
};

export const getPlanScreenState = () => planScreenState;

export const handlePlanScreenCreateAction = () => {
  const state = getPlanScreenState();
  switch (state.activeTab) {
    case 'plans':
      state.refs.plansSectionRef?.current?.openCreateDialog();
      break;
    case 'mesocycles':
      state.refs.mesocyclesSectionRef?.current?.openCreateDialog();
      break;
    case 'exercises':
      state.refs.exercisesSectionRef?.current?.openCreateDialog();
      break;
  }
};

export const getPlanScreenResourceName = () => {
  const state = getPlanScreenState();
  switch (state.activeTab) {
    case 'plans':
      return 'Plan';
    case 'mesocycles':
      return 'Mesocycle';
    case 'exercises':
      return 'Exercise';
    default:
      return '';
  }
};

const updatePlanScreenState = (updates: Partial<PlanScreenState>) => {
  planScreenState = { ...planScreenState, ...updates };
  stateUpdateListeners.forEach((listener) => listener());
};

export const PlanScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlanTab>('plans');
  const plansSectionRef = useRef<PlansSectionRef>(null);
  const mesocyclesSectionRef = useRef<MesocyclesSectionRef>(null);
  const exercisesSectionRef = useRef<ExercisesSectionRef>(null);

  // Update module-level state when component state or refs change
  useEffect(() => {
    updatePlanScreenState({
      activeTab,
      refs: {
        plansSectionRef: plansSectionRef as React.RefObject<PlansSectionRef> | null,
        mesocyclesSectionRef: mesocyclesSectionRef as React.RefObject<MesocyclesSectionRef> | null,
        exercisesSectionRef: exercisesSectionRef as React.RefObject<ExercisesSectionRef> | null,
      },
    });
  }, [activeTab]);

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
    padding: spacing.sm,
    paddingBottom: spacing.sm,
  },
});

