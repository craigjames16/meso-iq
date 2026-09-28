import React, { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../navigation/MainNavigator';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { mesocyclesService } from '../../services/mesocyclesService';
import { useMesocycleSummaries } from '../../hooks/useMesocycleSummaries';
import { usePlans } from '../../hooks/usePlans';
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary';
import { useCycleStats } from '../../hooks/useCycleStats';
import { invalidateMesocycles } from '../../hooks/mesocycleData';
import { Button, Card, DeltaText, IconButton, PlusGlyph, Screen, ScreenHeader, Segmented } from '../../components/ui';
import { NewProgramSheet } from '../../components/plan/NewProgramSheet';
import { ProgramsTab } from '../plan/ProgramsTab';
import { ExercisesTab } from '../plan/ExercisesTab';
import { colors, type, size } from '../../theme';
import { formatPercent } from '../../utils/format';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Plan'>, NativeStackNavigationProp<RootStackParamList>>;
type PlanTab = 'programs' | 'exercises';

let lastTab: PlanTab = 'programs';

export const PlanScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [tab, setTabState] = useState<PlanTab>(lastTab);
  const [newOpen, setNewOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);
  const mesos = useMesocycleSummaries();
  const plans = usePlans();
  const library = useExerciseLibrary();
  const active = mesos.data.find((m) => m.status === 'IN_PROGRESS') ?? null;
  const cycle = useCycleStats(active?.id ?? null);

  const setTab = (t: PlanTab) => {
    lastTab = t;
    setTabState(t);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([mesos.refresh(), plans.refresh(), library.refresh()]);
    setRefreshing(false);
  };

  const endEarly = () => {
    if (!active) return;
    Alert.alert(`End ${active.name} early?`, 'The cycle is marked complete. Logged sessions stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End cycle',
        style: 'destructive',
        onPress: async () => {
          setEnding(true);
          try {
            await mesocyclesService.completeMesocycle(active.id);
            invalidateMesocycles();
          } catch (err) {
            Alert.alert("Couldn't end the cycle", err instanceof Error ? err.message : 'Try again.');
          } finally {
            setEnding(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.secondary} />}
      header={
        <ScreenHeader
          title="Plan"
          right={
            <IconButton
              icon={<PlusGlyph color={colors.text.primary} />}
              onPress={() => setNewOpen(true)}
              accessibilityLabel="New program"
              variant="glass"
              size={34}
            />
          }
        />
      }
    >
      {active ? (
        <Card variant="hero" gap={10}>
          <View style={styles.cycleHead}>
            <Text style={styles.label}>ACTIVE CYCLE</Text>
            <Text style={styles.week}>
              Week {cycle.data.currentWeek} of {active.iterations}
            </Text>
          </View>
          <Text style={styles.title}>
            {active.name}
            {active.planName ? ` · ${active.planName}` : ''}
          </Text>
          <Text style={styles.meta}>
            {active.daysLogged} of {active.daysTotal} days logged
            {active.adherence != null ? ` · ${formatPercent(active.adherence)} adherence` : ''}
            {active.avgE1rm != null ? ' · ' : ''}
            {active.avgE1rm != null ? <DeltaText value={active.avgE1rm} suffix="est. 1RM so far" style={styles.inlineDelta} /> : null}
          </Text>
          <View style={styles.actions}>
            <Button
              label="Adjust cycle"
              variant="secondary"
              size="small"
              onPress={() => navigation.navigate('MesocycleDetail', { mesocycleId: active.id })}
              style={styles.flex}
            />
            <Button label="End early" variant="secondary" size="small" onPress={endEarly} loading={ending} style={styles.flex} />
          </View>
        </Card>
      ) : null}

      <Segmented
        options={[
          { value: 'programs', label: 'Programs' },
          { value: 'exercises', label: 'Exercises' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'programs' ? <ProgramsTab mesocycles={mesos.data} onNewProgram={() => setNewOpen(true)} /> : <ExercisesTab />}

      <NewProgramSheet
        visible={newOpen}
        onClose={() => setNewOpen(false)}
        onBuild={() => {
          setNewOpen(false);
          navigation.navigate('EditPlan', {});
        }}
        onDrafted={(planId) => {
          setNewOpen(false);
          navigation.navigate('EditPlan', { planId, draftFromAI: true });
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  cycleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...type.label,
    fontSize: size.caption,
    color: colors.text.secondary,
  },
  week: {
    ...type.metaSmall,
    fontSize: size.metaMid,
    color: colors.text.muted,
  },
  title: {
    ...type.cardTitle,
    fontSize: size.heading,
    color: colors.text.primary,
  },
  meta: {
    ...type.meta,
    color: colors.text.muted,
  },
  inlineDelta: {
    fontSize: size.meta,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  flex: {
    flex: 1,
  },
});
