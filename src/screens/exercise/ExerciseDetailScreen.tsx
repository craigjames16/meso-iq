import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { repRangeLabel, topSet } from '../../analytics';
import { useExerciseProgress } from '../../hooks/useExerciseProgress';
import { usePlans } from '../../hooks/usePlans';
import { LineChart, niceTicks } from '../../components/charts';
import { E1rmChart, RecordTiles, monthLabels } from '../../components/exercise/LiftCharts';
import { EditExerciseSheet } from '../../components/exercise/EditExerciseSheet';
import { planDayName, sortedDays } from '../../components/plan/planText';
import { Card, CardTitle, DetailHeader, EmptyState, ErrorState, ListRow, Screen, SectionLabel, Segmented, Skeleton, Tag, deltaColor } from '../../components/ui';
import { features } from '../../config/features';
import { colors, muscleLabel, type } from '../../theme';
import { calendarDaysBetween, formatCompact, formatDaysAgo, formatMediumDay, formatNumber, formatSigned, formatWeight, monthLong } from '../../utils/format';

type Route = RouteProp<RootStackParamList, 'ExerciseDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'ExerciseDetail'>;

const SESSION_ROWS = 5;

export const ExerciseDetailScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const progress = useExerciseProgress(params.exerciseId, 'all');
  const plans = usePlans();
  const [chart, setChart] = useState<'e1rm' | 'vol'>('e1rm');
  const [allSessions, setAllSessions] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const p = progress.data;
  const ex = p.exercise;

  const usedIn = useMemo(
    () =>
      plans.data.flatMap((plan) =>
        sortedDays(plan).flatMap((d) =>
          (d.workout?.workoutExercises ?? [])
            .filter((we) => we.exercise.id === params.exerciseId)
            .map((we) => ({ key: `${plan.id}-${d.id}`, plan, day: d, we })),
        ),
      ),
    [plans.data, params.exerciseId],
  );
  const programCount = new Set(usedIn.map((u) => u.plan.id)).size;

  if (!ex) {
    return (
      <Screen bottom="none">
        <DetailHeader title="Exercise" onBack={() => navigation.goBack()} />
        {progress.error ? <ErrorState onRetry={progress.refresh} /> : <Skeleton height={400} />}
      </Screen>
    );
  }

  const sessions = [...p.sessions].reverse();
  const last = sessions[0]?.completedAt;
  const series = p.series;
  const current = series[series.length - 1]?.e1rm ?? null;
  const first = series[0]?.e1rm ?? null;
  const change = current != null && first != null && series.length > 1 ? current - first : null;

  return (
    <Screen bottom="none" refreshControl={<RefreshControl refreshing={false} onRefresh={progress.refresh} tintColor={colors.text.secondary} />}>
      <DetailHeader
        title={ex.name}
        titleAccessory={ex.category ? <Tag label={muscleLabel(ex.category)} /> : undefined}
        meta={
          sessions.length > 0
            ? `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} · last ${formatDaysAgo(calendarDaysBetween(last!, new Date()))}`
            : 'Never performed'
        }
        onBack={() => navigation.goBack()}
        action={{ label: 'Edit', onPress: () => setEditOpen(true) }}
      />

      {sessions.length === 0 ? (
        <EmptyState message="You haven't logged this yet." />
      ) : (
        <>
          <Card padding={16} gap={12}>
            <SectionLabel>ESTIMATED 1RM</SectionLabel>
            <View style={styles.heroRow}>
              <Text style={styles.hero}>{current != null ? formatNumber(current) : '—'}</Text>
              <Text style={styles.unit}>lb</Text>
              {change != null && first ? (
                <Text style={[styles.change, { color: deltaColor(change / first) }]}>
                  {formatSigned(change)} since {monthLong(new Date(series[0].date).getMonth())}
                </Text>
              ) : null}
            </View>
            <Segmented
              size="small"
              options={[
                { value: 'e1rm', label: '1RM' },
                { value: 'vol', label: 'Vol' },
              ]}
              value={chart}
              onChange={setChart}
            />
            {chart === 'e1rm' ? (
              series.length > 0 ? (
                <E1rmChart series={series} trend={p.trend} name={ex.name} />
              ) : (
                <Text style={styles.meta}>Not enough sessions yet</Text>
              )
            ) : (
              <LineChart
                points={p.volumeSeries.map((v) => ({ x: new Date(v.date), y: v.volume }))}
                yTicks={p.volumeSeries.length ? niceTicks(Math.min(...p.volumeSeries.map((v) => v.volume)), Math.max(...p.volumeSeries.map((v) => v.volume)), 4) : undefined}
                xLabels={monthLabels(p.volumeSeries.map((v) => new Date(v.date)))}
                formatY={formatCompact}
                accessibilityLabel={`Session volume for ${ex.name}`}
              />
            )}
          </Card>

          <RecordTiles records={p.records} />

          <Card padding={16} gap={10}>
            <CardTitle
              title="Every session"
              action={sessions.length > SESSION_ROWS ? { label: allSessions ? 'Fewer' : `All ${sessions.length}`, onPress: () => setAllSessions((v) => !v) } : undefined}
            />
            {(allSessions ? sessions : sessions.slice(0, SESSION_ROWS)).map((s, i) => {
              const top = topSet(s.sets);
              const ordered = [...s.sets].sort((a, b) => a.setNumber - b.setNumber || (a.subSetNumber ?? 0) - (b.subSetNumber ?? 0));
              return (
                <View key={s.workoutInstanceId} style={[styles.session, i > 0 && styles.divider]}>
                  <Text style={styles.sessionDate}>{formatMediumDay(s.completedAt)}</Text>
                  <Text style={styles.sets}>
                    {ordered.map((set, j) => (
                      <Text key={j} style={set === top ? styles.top : undefined}>
                        {j > 0 ? '  ' : ''}
                        {set.subSetNumber != null ? '↘ ' : ''}
                        {formatWeight(set.weight)} × {set.reps}
                      </Text>
                    ))}
                  </Text>
                </View>
              );
            })}
            <Text style={[styles.meta, styles.rule]}>Highlighted set is the one the est. 1RM comes from.</Text>
          </Card>
        </>
      )}

      {usedIn.length > 0 ? (
        <>
          <SectionLabel>{`USED IN ${programCount} ${programCount === 1 ? 'PROGRAM' : 'PROGRAMS'}`}</SectionLabel>
          <Card gap={0}>
            {usedIn.map((u, i) => {
              const range = repRangeLabel(u.we.repMin, u.we.repMax);
              return (
                <ListRow
                  key={u.key}
                  title={`${u.plan.name} · Day ${u.day.dayNumber}`}
                  meta={planDayName(u.day)}
                  value={features.PROGRAM_TARGETS && range ? `${u.we.startingSets ?? 2} × ${range}` : undefined}
                  divider={i > 0}
                  chevron
                  onPress={() => navigation.navigate('PlanDetail', { planId: u.plan.id })}
                />
              );
            })}
          </Card>
        </>
      ) : null}

      <EditExerciseSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        exercise={{ id: ex.id, name: ex.name, category: ex.category }}
        programCount={programCount}
        sessionCount={sessions.length}
        onSaved={() => {
          setEditOpen(false);
          progress.refresh();
          plans.refresh();
        }}
        onDeleted={() => {
          setEditOpen(false);
          navigation.goBack();
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' },
  hero: { ...type.hero, color: colors.text.primary },
  unit: { ...type.body, color: colors.text.muted },
  change: { ...type.bodyStrong },
  meta: { ...type.metaSmall, color: colors.text.muted },
  rule: { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border.dividerAlt },
  session: { gap: 4, paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.divider },
  sessionDate: { ...type.metaSmall, color: colors.text.muted },
  sets: { ...type.body, color: colors.text.body, fontVariant: ['tabular-nums'] },
  top: { color: colors.data.main, fontWeight: '600' },
});
