import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import {
  ALL_MUSCLES,
  fourWeekAverage,
  hardSetsByExercise,
  isoWeekKey,
  weeklyHardSets,
  type Muscle,
} from '../../analytics';
import { useCycleStats, type StrengthRow } from '../../hooks/useCycleStats';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { BarRow, LineKey, Radar, Sparkline } from '../../components/charts';
import {
  Card,
  CardTitle,
  EmptyState,
  ErrorState,
  Insight,
  ListRow,
  SectionLabel,
  Sheet,
  Skeleton,
  TrendGlyph,
  WarningGlyph,
} from '../../components/ui';
import { colors, muscleLabel, muscleShort, radius, type } from '../../theme';
import { formatNumber, formatPercentDelta } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TREND_ROWS = 5;

interface CycleTabProps {
  mesocycleId: number | null;
  /** False when the account has no mesocycles at all. */
  hasCycles: boolean;
  onGoToPlan: () => void;
}

function countDelta(value: number, avg: number): { label: string; color: string } {
  const d = Math.round(value - avg);
  if (Math.abs(value - avg) < 0.5 || d === 0) return { label: '—', color: colors.text.muted };
  return d > 0 ? { label: `+${d}`, color: colors.success.pillText } : { label: `−${Math.abs(d)}`, color: colors.danger.base };
}

export const CycleTab: React.FC<CycleTabProps> = ({ mesocycleId, hasCycles, onGoToPlan }) => {
  const navigation = useNavigation<Nav>();
  const stats = useCycleStats(mesocycleId);
  const history = useTrainingHistory();
  const [showAllTrend, setShowAllTrend] = useState(false);
  const [barMuscle, setBarMuscle] = useState<Muscle | null>(null);
  const { sessions, muscleOf } = history.data;
  const d = stats.data;

  const thisWeek = useMemo(() => {
    const week = isoWeekKey(new Date());
    const weekly = weeklyHardSets(sessions, muscleOf);
    const current = weekly.get(week);
    const avg = fourWeekAverage(weekly, week);
    const rows = ALL_MUSCLES.map((m) => ({ muscle: m, count: current?.[m] ?? 0, avg: avg[m] }))
      .filter((r) => r.count > 0 || r.avg > 0)
      .sort((a, b) => b.count - a.count || b.avg - a.avg);
    const weekSessions = sessions.filter((s) => isoWeekKey(new Date(s.completedAt)) === week);
    return { rows, weekSessions, max: Math.max(1, ...rows.map((r) => Math.max(r.count, r.avg))) };
  }, [sessions, muscleOf]);

  if (!hasCycles) {
    return <EmptyState message="Start a cycle to see how it's going" action={{ label: 'Go to Plan', onPress: onGoToPlan }} />;
  }
  if (stats.error && !d.detail) return <ErrorState onRetry={stats.refresh} />;
  if (!d.detail) {
    return (
      <>
        <Skeleton height={44} />
        <Skeleton height={140} />
        <Skeleton height={260} />
      </>
    );
  }

  const detail = d.detail;
  const done = detail.status === 'COMPLETE';
  const heroLabel = done
    ? `COMPLETE · ${detail.iterations} WEEKS`
    : `WEEK ${d.currentWeek} OF ${detail.iterations}${d.currentRir != null ? ` · RIR ${d.currentRir}` : ''}`;

  // --- What changed --------------------------------------------------------
  const stall = d.stalls[0];
  const riser = d.fastestRiser;
  const insights: React.ReactNode[] = [];
  if (stall && stall.current != null) {
    insights.push(
      <Insight
        key="stall"
        tone="warning"
        icon={<WarningGlyph size={18} />}
        title={`${stall.name} has stalled`}
        body={
          stall.setsRising
            ? `Est. 1RM flat at ${formatNumber(stall.current)} lb for ${stall.flatSessions} sessions while sets went up. Deload it or swap the movement.`
            : `Est. 1RM flat at ${formatNumber(stall.current)} lb for ${stall.flatSessions} sessions.`
        }
      />,
    );
  }
  if (riser) {
    const label = muscleLabel(riser.muscle);
    insights.push(
      <Insight
        key="riser"
        tone="success"
        icon={<TrendGlyph size={18} color={colors.success.base} />}
        title={`${label} is your fastest riser`}
        body={`${formatPercentDelta(riser.rate)} est. 1RM per week across ${riser.exerciseCount} ${label.toLowerCase()} ${riser.exerciseCount === 1 ? 'lift' : 'lifts'}, best of any muscle this cycle.`}
      />,
    );
  }

  // --- Strength trend ------------------------------------------------------
  const trendRows: StrengthRow[] = showAllTrend ? d.strength : d.strength.slice(0, TREND_ROWS);

  const barExercises =
    barMuscle != null
      ? [...hardSetsByExercise(thisWeek.weekSessions, barMuscle, muscleOf).entries()]
          .map(([id, n]) => ({
            id,
            n,
            name: thisWeek.weekSessions.find((s) => s.exerciseNames?.[id])?.exerciseNames?.[id] ?? 'Exercise',
          }))
          .sort((a, b) => b.n - a.n)
      : [];

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroLabel}>{heroLabel}</Text>
          <Text style={styles.heroMeta}>
            {detail.plan?.name} · {d.daysLogged} of {d.daysTotal} days logged
          </Text>
        </View>
        <View style={styles.weeks} accessibilityLabel={`Week ${d.currentWeek} of ${detail.iterations}`}>
          {Array.from({ length: detail.iterations }, (_, i) => (
            <View key={i} style={[styles.weekDot, (done || i + 1 <= d.currentWeek) && styles.weekDotOn]} />
          ))}
        </View>
      </View>

      {insights.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>WHAT CHANGED</SectionLabel>
          {insights}
        </View>
      ) : null}

      <Card padding={16} gap={14}>
        <CardTitle title="Hard sets this week" subtitle="Sets, not tonnage, comparable across muscles" />
        {thisWeek.rows.length === 0 ? (
          <Text style={styles.empty}>No hard sets logged this week yet.</Text>
        ) : (
          <View style={styles.bars}>
            {thisWeek.rows.map((r) => (
              <BarRow
                key={r.muscle}
                label={muscleLabel(r.muscle).toUpperCase()}
                labelWidth={78}
                value={r.count}
                max={thisWeek.max}
                tick={r.avg}
                delta={countDelta(r.count, r.avg)}
                onPress={() => setBarMuscle(r.muscle)}
                accessibilityLabel={`${muscleLabel(r.muscle)}: ${r.count} hard sets, 4-week average ${r.avg.toFixed(1)}`}
              />
            ))}
          </View>
        )}
        <View style={styles.caption}>
          <View style={styles.tickKey} />
          <Text style={styles.captionText}>Tick = your 4-week average. Tap a bar for the exercises behind it.</Text>
        </View>
      </Card>

      <Card padding={16} gap={13}>
        <CardTitle
          title="Strength trend"
          subtitle="Est. 1RM, this mesocycle"
          action={
            d.strength.length > TREND_ROWS
              ? { label: showAllTrend ? 'Top 5' : `All ${d.strength.length}`, onPress: () => setShowAllTrend((v) => !v) }
              : undefined
          }
        />
        {trendRows.length === 0 ? (
          <Text style={styles.empty}>Not enough sessions yet</Text>
        ) : (
          <View>
            {trendRows.map((r, i) => (
              <ListRow
                key={r.exerciseId}
                title={r.name}
                titleAccessory={r.stalled ? <WarningGlyph size={13} /> : undefined}
                right={<Sparkline values={r.series.map((p) => p.e1rm)} />}
                value={r.current != null ? formatNumber(r.current) : '—'}
                delta={r.delta}
                deltaTone={r.stalled ? 'danger' : 'auto'}
                divider={i > 0}
                onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: r.exerciseId })}
                accessibilityLabel={`${r.name}${r.stalled ? ', stalled' : ''}`}
              />
            ))}
          </View>
        )}
        <Text style={[styles.captionText, styles.captionRule]}>Epley estimate from the heaviest working set each session.</Text>
      </Card>

      {d.radar && d.radar.axes.length >= 3 && d.previous ? (
        <Card padding={16} gap={10}>
          <CardTitle title="This cycle vs. last" subtitle={`Weekly sets per muscle, week ${d.currentWeek} of each`} />
          <Radar
            axes={d.radar.axes.map((m) => muscleShort(m))}
            current={d.radar.current}
            previous={d.radar.previous}
            accessibilityLabel={`Weekly sets per muscle in ${detail.name} against ${d.previous.name}`}
          />
          <LineKey
            items={[
              { kind: 'line', label: `${detail.name} (now)`, color: colors.data.main },
              { kind: 'line', label: d.previous.name, color: colors.data.reference, dashed: true },
            ]}
          />
        </Card>
      ) : null}

      <Sheet
        visible={barMuscle != null}
        onClose={() => setBarMuscle(null)}
        title={barMuscle ? `${muscleLabel(barMuscle)} this week` : ''}
        subtitle="Hard sets per exercise"
      >
        <View>
          {barExercises.length === 0 ? <Text style={styles.empty}>No hard sets this week yet.</Text> : null}
          {barExercises.map((e, i) => (
            <ListRow
              key={e.id}
              title={e.name}
              value={`${e.n} ${e.n === 1 ? 'set' : 'sets'}`}
              divider={i > 0}
              onPress={() => {
                setBarMuscle(null);
                navigation.navigate('ExerciseDetail', { exerciseId: e.id });
              }}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 2,
  },
  heroText: {
    flex: 1,
    gap: 3,
  },
  heroLabel: {
    ...type.label,
    color: colors.text.muted,
  },
  heroMeta: {
    ...type.meta,
    fontSize: 13,
    color: colors.text.secondary,
  },
  weeks: {
    flexDirection: 'row',
    gap: 4,
  },
  weekDot: {
    width: 9,
    height: 9,
    borderRadius: radius.cell,
    backgroundColor: colors.border.field,
  },
  weekDotOn: {
    backgroundColor: colors.data.main,
  },
  section: {
    gap: 8,
  },
  bars: {
    gap: 9,
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.dividerAlt,
  },
  tickKey: {
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: colors.data.reference,
  },
  captionText: {
    flex: 1,
    ...type.metaSmall,
    color: colors.text.muted,
  },
  captionRule: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.dividerAlt,
  },
  empty: {
    ...type.meta,
    color: colors.text.muted,
  },
});
