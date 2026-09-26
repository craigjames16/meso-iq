import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { workoutService } from '../../services/workoutService';
import type { WorkoutInstance } from '../../types/workout';
import { sessionFromInstance, sessionTotals, tonnageDeltaVsLast, volume, isHardSet, type Session } from '../../analytics';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { Card, DetailHeader, EmptyState, ErrorState, Screen, Skeleton, StatRow, StatTile, deltaColor } from '../../components/ui';
import { ReadOnlySets } from '../../components/session/ReadOnlySets';
import { planContext, sessionName } from '../../components/session/sessionText';
import { colors, type } from '../../theme';
import { formatMediumDay, formatNumber, formatPercentDelta } from '../../utils/format';

type Route = RouteProp<RootStackParamList, 'PastSession'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'PastSession'>;

/** A finished workout, read-only. Editing goes through the logger. */
export const PastSessionScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const history = useTrainingHistory();
  const [instance, setInstance] = useState<WorkoutInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setInstance((await workoutService.getWorkoutInstance(params.workoutInstanceId)) as WorkoutInstance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this.");
    } finally {
      setLoading(false);
    }
  }, [params.workoutInstanceId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const session: Session | null = useMemo(() => (instance ? sessionFromInstance(instance) : null), [instance]);
  const dayNumber = instance?.planInstanceDays?.[0]?.planDay?.dayNumber ?? null;

  const exercises = useMemo(() => {
    if (!session) return [];
    const ids = [...(session.exerciseOrder ?? [])];
    for (const s of session.sets) if (!ids.includes(s.exerciseId)) ids.push(s.exerciseId);
    return ids
      .map((id) => ({ id, name: session.exerciseNames?.[id] ?? 'Exercise', sets: session.sets.filter((s) => s.exerciseId === id) }))
      .filter((e) => e.sets.length > 0);
  }, [session]);

  const name = session ? sessionName(session, history.data.muscleOf, dayNumber) : instance?.workout?.name ?? 'Workout';
  const totals = session ? sessionTotals(session) : null;
  const delta = session ? tonnageDeltaVsLast(session, history.data.sessions) : null;
  const meta = session
    ? [formatMediumDay(session.completedAt), planContext(session, dayNumber)].join(' · ')
    : undefined;

  return (
    <Screen
      bottom="none"
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.text.secondary} />}
    >
      <DetailHeader
        title={name}
        meta={meta}
        onBack={() => navigation.goBack()}
        action={instance ? { label: 'Edit', onPress: () => navigation.navigate('WorkoutDetail', { workoutInstanceId: params.workoutInstanceId }) } : undefined}
      />
      {error && !instance ? (
        <ErrorState onRetry={load} />
      ) : loading && !instance ? (
        <>
          <Skeleton height={64} />
          <Skeleton height={200} />
          <Skeleton height={200} />
        </>
      ) : !session ? (
        <EmptyState message="This workout hasn't been finished yet." />
      ) : (
        <>
          <StatRow>
            <StatTile label="Sets" value={String(totals!.hardSets)} />
            <StatTile label="lb lifted" value={formatNumber(totals!.tonnage)} />
            {delta != null ? (
              <StatTile label={`vs last ${name}`} value={formatPercentDelta(delta)} valueColor={deltaColor(delta)} />
            ) : (
              <StatTile label={`vs last ${name}`} value="—" valueColor={colors.text.muted} />
            )}
          </StatRow>
          {exercises.length === 0 ? <EmptyState message="No sets were logged in this workout." /> : null}
          {exercises.map((e) => {
            const hard = e.sets.filter(isHardSet).length;
            return (
              <Card key={e.id} gap={10}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{e.name}</Text>
                  <Text style={styles.meta}>
                    {hard} {hard === 1 ? 'set' : 'sets'} · {formatNumber(volume(e.sets))} lb
                  </Text>
                </View>
                <ReadOnlySets sets={e.sets} />
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    ...type.cardTitle,
    color: colors.text.primary,
    flexShrink: 1,
  },
  meta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
});
