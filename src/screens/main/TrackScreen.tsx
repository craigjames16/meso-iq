import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../../navigation/MainNavigator';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useToday } from '../../hooks/useToday';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { useCycleStats } from '../../hooks/useCycleStats';
import { usePlans } from '../../hooks/usePlans';
import {
  DEFAULT_STARTING_SETS,
  daysSinceTrained,
  isMainSet,
  sessionTotals,
  toMuscle,
  volume,
  weekStreak,
  type Muscle,
} from '../../analytics';
import {
  AvatarButton,
  Button,
  Card,
  CardTitle,
  ErrorState,
  FlameGlyph,
  PlusGlyph,
  Screen,
  ScreenHeader,
  SectionLabel,
  Skeleton,
} from '../../components/ui';
import { TodayHero, type TodayHeroProps } from '../../components/track/TodayHero';
import { ThisWeek, type WeekCell } from '../../components/track/ThisWeek';
import { OffPlanSheet } from '../../components/track/OffPlanSheet';
import { SessionRow } from '../../components/session/SessionRow';
import { colors, muscleLabel, radius, type } from '../../theme';
import { calendarDaysBetween, formatDaysAgo, formatLongDay, formatNumber, formatWeight } from '../../utils/format';
import { workoutDisplayName } from '../../utils/names';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Track'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const RECENT_COUNT = 3;
const RECOVERING_DAYS = 3;

interface DayExercise {
  id: number;
  name: string;
  category?: string;
  order: number;
}

export const TrackScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const today = useToday();
  const history = useTrainingHistory();
  const plans = usePlans();
  const cycle = useCycleStats(today.mesocycle?.id ?? null);
  const [offPlanOpen, setOffPlanOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { sessions, muscleOf } = history.data;
  const now = useMemo(() => new Date(), []);
  const streak = weekStreak(sessions, now);

  // Workout names per plan day, from the schedule, for This week and Recent.
  const dayNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of today.upcomingDays as any[]) {
      const dn = d.planDay?.dayNumber;
      if (dn == null || map.has(dn)) continue;
      const cats = (d.planDay?.workout?.workoutExercises ?? []).map((we: any) => we.exercise?.category);
      map.set(dn, d.planDay?.isRestDay ? 'Rest' : workoutDisplayName(d.planDay?.workout?.name, cats, dn));
    }
    return map;
  }, [today.upcomingDays]);

  const dayByInstance = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of cycle.data.weeks) for (const d of w.days) if (d.workoutInstanceId) map.set(d.workoutInstanceId, d.dayNumber);
    return map;
  }, [cycle.data.weeks]);

  const next = today.nextDay as any;
  const nextExercises: DayExercise[] = useMemo(
    () =>
      [...(next?.planDay?.workout?.workoutExercises ?? [])]
        .sort((a: any, b: any) => a.order - b.order)
        .map((we: any) => ({ id: we.exercise?.id, name: we.exercise?.name, category: we.exercise?.category, order: we.order })),
    [next],
  );

  const startDay = async () => {
    try {
      const id = await today.startNextDay();
      if (id != null) navigation.navigate('WorkoutDetail', { workoutInstanceId: id });
      else cycle.refresh();
    } catch (err) {
      Alert.alert("Couldn't start the day", err instanceof Error ? err.message : 'Pull to refresh and try again.');
    }
  };

  // --- Hero ----------------------------------------------------------------

  const hero: TodayHeroProps | null = (() => {
    if (today.loading && !today.mesocycle && !today.inProgress) return null;
    const meso = today.mesocycle;
    if (today.inProgress) {
      const ip = today.inProgress;
      const label = ip.mesocycleName
        ? [ip.mesocycleName, ip.iteration != null && `Week ${ip.iteration}`, ip.dayNumber != null && `Day ${ip.dayNumber}`].filter(Boolean).join(' · ')
        : 'Off-plan';
      return {
        kind: 'inProgress',
        label: `${label} · In progress`.toUpperCase(),
        title: workoutDisplayName(ip.workoutName, ip.categories, ip.dayNumber),
        meta: `Resume · ${ip.loggedSets} ${ip.loggedSets === 1 ? 'set' : 'sets'} logged`,
        onPlay: () => navigation.navigate('WorkoutDetail', { workoutInstanceId: ip.workoutInstanceId }),
      };
    }
    if (meso && next) {
      const week = next.planInstance?.iterationNumber;
      const dayNumber = next.planDay?.dayNumber;
      const label = [meso.name, week != null && `Week ${week}`, dayNumber != null && `Day ${dayNumber}`].filter(Boolean).join(' · ').toUpperCase();
      if (next.planDay?.isRestDay) return { kind: 'rest', label, onDone: startDay, busy: today.starting };

      const title = workoutDisplayName(next.planDay?.workout?.name, nextExercises.map((e) => e.category), dayNumber);
      const workoutId = next.planDay?.workout?.id;
      const lastSame = [...sessions].reverse().find((s) => s.workoutId === workoutId) ?? null;
      const mainSetsIn = (exerciseId: number) =>
        lastSame ? lastSame.sets.filter((s) => s.exerciseId === exerciseId && isMainSet(s)).sort((a, b) => a.setNumber - b.setNumber) : [];
      const startingSets = nextExercises.reduce((t, e) => t + (mainSetsIn(e.id).length || DEFAULT_STARTING_SETS), 0);

      let carryOver: { text: string; strong?: boolean }[] | null = null;
      if (lastSame) {
        const days = calendarDaysBetween(lastSame.completedAt, now);
        carryOver = [
          { text: `Last ${title} was ${formatDaysAgo(days)} at ` },
          { text: `${formatNumber(volume(lastSame.sets))} lb`, strong: true },
          { text: '.' },
        ];
        const first = nextExercises[0];
        const firstSets = first ? mainSetsIn(first.id) : [];
        if (first && firstSets.length > 0) {
          carryOver.push(
            { text: ' Opening set target: ' },
            { text: `${first.name} ${firstSets.length} × ${firstSets[0].reps} @ ${formatWeight(firstSets[0].weight)} lb`, strong: true },
            { text: '.' },
          );
        }
      }
      return {
        kind: 'workout',
        label,
        title,
        meta: [meso.plan?.name, `${nextExercises.length} ${nextExercises.length === 1 ? 'exercise' : 'exercises'}`, `${startingSets} sets`]
          .filter(Boolean)
          .join(' · '),
        chips: nextExercises.slice(0, 3).map((e) => e.name),
        moreChips: Math.max(0, nextExercises.length - 3),
        carryOver,
        onPlay: startDay,
        busy: today.starting,
      };
    }
    if (meso && !next) {
      return {
        kind: 'noCycle',
        title: 'Cycle complete',
        meta: `Every day in ${meso.name} is logged. Start the next cycle from Plan.`,
        onStartCycle: () => navigation.navigate('Plan'),
      };
    }
    if (history.data.loaded && sessions.length === 0 && !plans.loading && plans.data.length === 0) {
      return { kind: 'newAccount', onBuild: () => navigation.navigate('Plan') };
    }
    return { kind: 'noCycle', onStartCycle: () => navigation.navigate('Plan') };
  })();

  const isNewAccount = hero?.kind === 'newAccount';

  // --- Today hits ----------------------------------------------------------

  const hitCategories = today.inProgress ? today.inProgress.categories : !next?.planDay?.isRestDay ? nextExercises.map((e) => e.category) : [];
  const hits = [...new Set(hitCategories.map((c) => toMuscle(c)).filter((m): m is Muscle => !!m))].map((m) => ({
    muscle: m,
    days: daysSinceTrained(sessions, m, now, muscleOf),
  }));

  // --- This week -----------------------------------------------------------

  const currentWeek = cycle.data.weeks.find((w) => w.isCurrent);
  const weekCells: WeekCell[] = (currentWeek?.days ?? []).map((d) => {
    const isToday =
      !today.inProgress &&
      next?.planInstance?.iterationNumber === currentWeek?.iteration &&
      next?.planDay?.dayNumber === d.dayNumber;
    const name = d.workoutName ?? dayNames.get(d.dayNumber) ?? `Day ${d.dayNumber}`;
    const session = d.workoutInstanceId ? cycle.data.sessionById.get(d.workoutInstanceId) : undefined;
    if (d.isRestDay) return { dayNumber: d.dayNumber, state: isToday ? 'today' : 'rest', name: 'Rest' };
    if (d.state === 'done') {
      return {
        dayNumber: d.dayNumber,
        state: 'done',
        sets: session ? sessionTotals(session).hardSets : 0,
        name: dayNames.get(d.dayNumber) ?? name,
      };
    }
    if (isToday) return { dayNumber: d.dayNumber, state: 'today', name: dayNames.get(d.dayNumber) ?? name };
    return { dayNumber: d.dayNumber, state: d.state === 'missed' ? 'missed' : 'planned', name: dayNames.get(d.dayNumber) ?? name };
  });
  const trainingCells = (currentWeek?.days ?? []).filter((d) => !d.isRestDay);
  const weekDone = trainingCells.filter((d) => d.state === 'done').length;

  // --- Recent --------------------------------------------------------------

  const recent = [...sessions].reverse().slice(0, RECENT_COUNT);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([today.refresh(), history.refresh(), cycle.refresh(), plans.refresh()]);
    setRefreshing(false);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.secondary} />}>
      <ScreenHeader
        title="Today"
        subtitle={formatLongDay(now)}
        right={
          <>
            {streak > 0 ? (
              <View style={styles.streak} accessible accessibilityLabel={`${streak} week streak`}>
                <FlameGlyph />
                <Text style={styles.streakText}>{streak} WK</Text>
              </View>
            ) : null}
            <AvatarButton initial={user?.email ?? '?'} onPress={() => navigation.navigate('AccountSettings')} />
          </>
        }
      />

      {today.error ? <ErrorState onRetry={onRefresh} /> : null}

      {hero ? <TodayHero {...hero} /> : <Skeleton height={236} />}

      {!isNewAccount && hits.length > 0 ? (
        <Card padding={16} gap={11}>
          <SectionLabel>TODAY HITS</SectionLabel>
          <View style={styles.hits}>
            {hits.map((h) => (
              <View key={h.muscle} style={styles.hit} accessible accessibilityLabel={`${muscleLabel(h.muscle)}: ${h.days == null ? 'not trained yet' : `${h.days} days since trained`}`}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        h.days == null ? colors.text.faint : h.days < RECOVERING_DAYS ? colors.warning.base : colors.success.base,
                    },
                  ]}
                />
                <View>
                  <Text style={styles.hitName}>{muscleLabel(h.muscle)}</Text>
                  <Text style={styles.hitSince}>
                    {h.days == null ? 'not yet' : h.days === 0 ? 'today' : `${h.days} ${h.days === 1 ? 'day' : 'days'}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {!isNewAccount && today.mesocycle && weekCells.length > 0 ? (
        <ThisWeek cells={weekCells} done={weekDone} total={trainingCells.length} />
      ) : !isNewAccount && today.mesocycle && cycle.loading ? (
        <Skeleton height={112} />
      ) : null}

      {!isNewAccount && (recent.length > 0 || history.loading) ? (
        <Card padding={16} gap={12}>
          <CardTitle title="Recent" action={{ label: 'All workouts', onPress: () => navigation.navigate('Data', { tab: 'history' }) }} />
          {recent.length === 0 ? (
            <Skeleton height={120} rounded="tile" />
          ) : (
            <View>
              {recent.map((s, i) => (
                <SessionRow
                  key={s.workoutInstanceId}
                  session={s}
                  sessions={sessions}
                  dayNumber={dayByInstance.get(s.workoutInstanceId) ?? null}
                  muscleOf={muscleOf}
                  divider={i > 0}
                  onPress={() => navigation.navigate('PastSession', { workoutInstanceId: s.workoutInstanceId })}
                />
              ))}
            </View>
          )}
        </Card>
      ) : null}

      <Button label="Log something off-plan" variant="dashed" icon={<PlusGlyph />} onPress={() => setOffPlanOpen(true)} full />

      <OffPlanSheet
        visible={offPlanOpen}
        onClose={() => setOffPlanOpen(false)}
        sessions={sessions}
        onStarted={(id) => {
          setOffPlanOpen(false);
          navigation.navigate('WorkoutDetail', { workoutInstanceId: id });
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.field,
    backgroundColor: colors.success.pillBg,
    borderWidth: 1,
    borderColor: colors.success.pillBorder,
  },
  streakText: {
    ...type.metaSmall,
    fontWeight: '600',
    color: colors.success.pillText,
  },
  hits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 14,
  },
  hit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.round,
  },
  hitName: {
    ...type.metaSmall,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.body,
  },
  hitSince: {
    ...type.metaSmall,
    fontSize: 11,
    color: colors.text.muted,
  },
});
