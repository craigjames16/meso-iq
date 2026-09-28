import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DataSubTab, MainTabParamList } from '../../navigation/MainNavigator';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { RANGE_LABELS, TIME_RANGES, type TimeRange } from '../../analytics';
import { useMesocycleSummaries } from '../../hooks/useMesocycleSummaries';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { useConsistency } from '../../hooks/useConsistency';
import { Chip, PickerSheet, Screen, ScreenHeader, Segmented } from '../../components/ui';
import { colors } from '../../theme';
import { CycleTab } from '../data/CycleTab';
import { ProgressTab } from '../data/ProgressTab';
import { HistoryTab } from '../data/HistoryTab';
import { invalidateExerciseHistory } from '../../hooks/exerciseSessions';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<MainTabParamList, 'Data'>, NativeStackNavigationProp<RootStackParamList>>;

// Remembered for the app session.
let lastTab: DataSubTab = 'cycle';
let lastRange: TimeRange = '6m';

export const DataScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<MainTabParamList, 'Data'>>();
  const [tab, setTab] = useState<DataSubTab>(route.params?.tab ?? lastTab);
  const [range, setRange] = useState<TimeRange>(lastRange);
  const [year, setYear] = useState(new Date().getFullYear());
  const [mesoId, setMesoId] = useState<number | null>(null);
  const [picker, setPicker] = useState<DataSubTab | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mesos = useMesocycleSummaries();
  const history = useTrainingHistory();
  const consistency = useConsistency(year);

  useEffect(() => {
    if (route.params?.tab) {
      setTab(route.params.tab);
      navigation.setParams({ tab: undefined });
    }
  }, [route.params?.tab, navigation]);

  useEffect(() => {
    lastTab = tab;
  }, [tab]);
  useEffect(() => {
    lastRange = range;
  }, [range]);

  // Default to the running cycle, else the latest.
  const defaultMeso = useMemo(
    () => mesos.data.find((m) => m.status === 'IN_PROGRESS') ?? mesos.data[0] ?? null,
    [mesos.data],
  );
  const selectedMeso = mesos.data.find((m) => m.id === mesoId) ?? defaultMeso;

  const onRefresh = async () => {
    setRefreshing(true);
    invalidateExerciseHistory();
    await Promise.all([mesos.refresh(), history.refresh(), consistency.refresh()]);
    setRefreshing(false);
  };

  const chip =
    tab === 'cycle' ? (
      selectedMeso ? (
        <Chip label={selectedMeso.name} dropdown onPress={() => setPicker('cycle')} accessibilityLabel={`Mesocycle: ${selectedMeso.name}`} />
      ) : null
    ) : tab === 'progress' ? (
      <Chip label={RANGE_LABELS[range]} dropdown onPress={() => setPicker('progress')} accessibilityLabel={`Time range: ${RANGE_LABELS[range]}`} />
    ) : (
      <Chip label={String(year)} dropdown onPress={() => setPicker('history')} accessibilityLabel={`Year: ${year}`} />
    );

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.secondary} />}
      header={
        <>
          <ScreenHeader title="Data" right={chip} />
          <Segmented
            options={[
              { value: 'cycle', label: 'Cycle' },
              { value: 'progress', label: 'Progress' },
              { value: 'history', label: 'History' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </>
      }
    >
      {tab === 'cycle' ? (
        <CycleTab
          mesocycleId={selectedMeso?.id ?? null}
          hasCycles={mesos.loading || mesos.data.length > 0}
          onGoToPlan={() => navigation.navigate('Plan')}
        />
      ) : tab === 'progress' ? (
        <ProgressTab range={range} />
      ) : (
        <HistoryTab year={year} />
      )}

      <PickerSheet
        visible={picker === 'cycle'}
        onClose={() => setPicker(null)}
        title="Mesocycle"
        options={mesos.data.map((m) => ({ value: m.id, label: m.name, meta: [m.planName, m.status === 'IN_PROGRESS' ? 'Running' : null].filter(Boolean).join(' · ') }))}
        value={selectedMeso?.id ?? null}
        onChange={setMesoId}
      />
      <PickerSheet
        visible={picker === 'progress'}
        onClose={() => setPicker(null)}
        title="Time range"
        options={TIME_RANGES.map((r) => ({ value: r, label: RANGE_LABELS[r] }))}
        value={range}
        onChange={setRange}
      />
      <PickerSheet
        visible={picker === 'history'}
        onClose={() => setPicker(null)}
        title="Year"
        options={consistency.data.years.map((y) => ({ value: y, label: String(y) }))}
        value={year}
        onChange={setYear}
      />
    </Screen>
  );
};
