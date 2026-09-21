import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { workoutService } from '../../services/workoutService';
import { useSchedule } from '../../context/ScheduleContext';
import type { WorkoutInstance } from '../../types/workout';
import {
  e1rm,
  sessionFromInstance,
  sessionPRs,
  sessionTotals,
  tonnageDeltaVsLast,
  topSet,
  type SessionPR,
} from '../../analytics';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { useCycleStats } from '../../hooks/useCycleStats';
import { loadExerciseHistory, type ExerciseHistory } from '../../hooks/exerciseSessions';
import { runLimited } from '../../hooks/cache';
import {
  Button,
  Card,
  DeltaText,
  ErrorState,
  ListRow,
  Screen,
  SectionLabel,
  Skeleton,
  StatRow,
  StatTile,
  deltaColor,
} from '../../components/ui';
import { planContext, sessionName } from '../../components/session/sessionText';
import { colors, radius, space, type } from '../../theme';
import { formatNumber, formatPercentDelta, formatSigned } from '../../utils/format';
import { workoutDisplayName } from '../../utils/names';

type Route = RouteProp<RootStackParamList, 'WorkoutComplete'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'WorkoutComplete'>;

const DoneBadge = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Circle cx={20} cy={20} r={19} fill={colors.success.pillBg} stroke={colors.success.pillBorder} strokeWidth={1} />
    <Path d="M12.5 20.5 17.5 25.5 27.5 14.5" stroke={colors.success.base} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PRGlyph = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M9 2.2 11 6.3l4.5.6-3.3 3.1.8 4.4L9 12.3l-4 2.1.8-4.4L2.5 6.9 7 6.3 9 2.2Z"
      stroke={colors.data.main}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  </Svg>
);

export const WorkoutCompleteScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { schedule } = useSchedule();
  const history = useTrainingHistory();
  const [instance, setInstance] = useState<WorkoutInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [histories, setHistories] = useState<ExerciseHistory[] | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = (await workoutService.getWorkoutInstance(params.workoutInstanceId)) as WorkoutInstance;
      setInstance(data);
      const ids = [...new Set((data.workoutExercises ?? []).map((we) => we.exerciseId))];
      const results = await runLimited(ids.map((id) => () => loadExerciseHistory(id, true)), 4);
      setHistories(results.filter((r): r is ExerciseHistory => !!r));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this.");
    }
  }, [params.workoutInstanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const session = useMemo(() => (instance ? sessionFromInstance(instance) : null), [instance]);
  const dayNumber = instance?.planInstanceDays?.[0]?.planDay?.dayNumber ?? null;
  const mesocycleId = session?.planned ? session.mesocycleId ?? null : null;
  const cycle = useCycleStats(mesocycleId);

  const { muscleOf, sessions } = history.data;
  const name = session ? sessionName(session, muscleOf, dayNumber) : instance?.workout?.name ?? 'Workout';
  const totals = session ? sessionTotals(session) : null;
  // History may not include this session yet; compare against it either way.
  const allSessions = useMemo(
    () => (session && !sessions.some((s) => s.workoutInstanceId === session.workoutInstanceId) ? [...sessions, session] : sessions),
    [sessions, session],
  );
  const delta = session ? tonnageDeltaVsLast(session, allSessions) : null;

  const prs: SessionPR[] = useMemo(
    () => (session && histories ? sessionPRs(session, histories.map((h) => h.sessions)) : []),
    [session, histories],
  );

  const exerciseRows = useMemo(() => {
    if (!session) return [];
    const ids = [...(session.exerciseOrder ?? [])];
    for (const s of session.sets) if (!ids.includes(s.exerciseId)) ids.push(s.exerciseId);
    const t = new Date(session.completedAt).getTime();
    return ids
      .map((id) => {
        const top = topSet(session.sets.filter((s) => s.exerciseId === id));
        const h = histories?.find((x) => x.id === id);
        const prev = h?.sessions
          .filter((s) => s.workoutInstanceId !== session.workoutInstanceId && new Date(s.completedAt).getTime() < t)
          .map((s) => topSet(s.sets))
          .filter(Boolean)
          .pop();
        const change = top && prev ? (e1rm(top.weight, top.reps) - e1rm(prev.weight, prev.reps)) / e1rm(prev.weight, prev.reps) : null;
        return { id, name: session.exerciseNames?.[id] ?? h?.name ?? 'Exercise', top, change };
      })
      .filter((r) => r.top || session.sets.some((s) => s.exerciseId === r.id));
  }, [session, histories]);

  const week = cycle.data.weeks.find((w) => w.iteration === session?.iteration);
  const weekTraining = week?.days.filter((d) => !d.isRestDay) ?? [];
  const weekDone = weekTraining.filter((d) => d.state === 'done' || d.workoutInstanceId === session?.workoutInstanceId).length;
  const next = (schedule?.upcomingDays ?? [])[0] as any;
  const nextLabel = next
    ? next.planDay?.isRestDay
      ? 'Rest day'
      : workoutDisplayName(
          next.planDay?.workout?.name,
          (next.planDay?.workout?.workoutExercises ?? []).map((we: any) => we.exercise?.category),
          next.planDay?.dayNumber,
        )
    : null;

  const prText = (pr: SessionPR) => {
    if (pr.kind === 'e1rm') {
      return `Est. 1RM ${formatNumber(pr.value)} lb${pr.delta != null ? ` · ${formatSigned(pr.delta)} lb` : ''}`;
    }
    return `Most reps at ${formatNumber(pr.weight ?? 0)} lb · ${pr.value}`;
  };

  const goToday = () => navigation.navigate('Main', { screen: 'Track' });

  return (
    <Screen bottom="none">
      <View style={styles.header}>
        <DoneBadge />
        <Text style={styles.title} accessibilityRole="header">
          Workout complete
        </Text>
        {session ? <Text style={styles.meta}>{[name, planContext(session, dayNumber)].join(' · ')}</Text> : null}
      </View>

      {error && !instance ? (
        <ErrorState onRetry={load} />
      ) : !session || !totals ? (
        <>
          <Skeleton height={70} />
          <Skeleton height={150} />
        </>
      ) : (
        <>
          <StatRow>
            <StatTile label="Sets" value={String(totals.hardSets)} />
            <StatTile label="lb lifted" value={formatNumber(totals.tonnage)} />
            <StatTile
              label={delta != null ? `vs last ${name}` : `First ${name}`}
              value={delta != null ? formatPercentDelta(delta) : '—'}
              valueColor={delta != null ? deltaColor(delta) : colors.text.muted}
            />
          </StatRow>

          {prs.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>PERSONAL RECORDS</SectionLabel>
              <Card gap={0}>
                {prs.map((pr, i) => (
                  <ListRow
                    key={`${pr.exerciseId}-${pr.kind}`}
                    title={session.exerciseNames?.[pr.exerciseId] ?? 'Exercise'}
                    meta={prText(pr)}
                    right={<PRGlyph />}
                    divider={i > 0}
                  />
                ))}
              </Card>
            </View>
          ) : null}

          {exerciseRows.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>EXERCISE BY EXERCISE</SectionLabel>
              <Card gap={0}>
                {exerciseRows.map((r, i) => (
                  <ListRow
                    key={r.id}
                    title={r.name}
                    meta={r.top ? `Top set ${r.top.weight} × ${r.top.reps}` : 'No working sets'}
                    right={histories == null ? <Skeleton height={14} width={40} rounded="field" /> : <DeltaText value={r.change} />}
                    divider={i > 0}
                  />
                ))}
              </Card>
            </View>
          ) : null}

          {session.planned && week ? (
            <Card gap={10}>
              <View style={styles.cycleHead}>
                <SectionLabel>THIS CYCLE</SectionLabel>
                <Text style={styles.cycleCount}>
                  Week {week.iteration} · {weekDone} of {weekTraining.length} days
                </Text>
              </View>
              <View style={styles.segments}>
                {weekTraining.map((d) => (
                  <View
                    key={d.dayNumber}
                    style={[
                      styles.segment,
                      (d.state === 'done' || d.workoutInstanceId === session.workoutInstanceId) && styles.segmentDone,
                    ]}
                  />
                ))}
              </View>
              {nextLabel ? <Text style={styles.next}>Next: {nextLabel}</Text> : null}
            </Card>
          ) : null}
        </>
      )}

      <Button label="Done" onPress={goToday} full />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 6,
    paddingTop: space.screenTop,
  },
  title: {
    ...type.detailTitle,
    color: colors.text.primary,
    marginTop: 6,
  },
  meta: {
    ...type.meta,
    color: colors.text.muted,
  },
  section: {
    gap: 8,
  },
  cycleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cycleCount: {
    ...type.metaSmall,
    fontSize: 12,
    color: colors.text.secondary,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radius.cell,
    backgroundColor: colors.border.track,
  },
  segmentDone: {
    backgroundColor: colors.success.base,
  },
  next: {
    ...type.meta,
    color: colors.text.secondary,
  },
});
