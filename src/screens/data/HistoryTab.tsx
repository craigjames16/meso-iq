import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { allTimeTotals, dayKey, monthStarts, recentWeeks, tonnageByMonth, type HeatLevel } from '../../analytics';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { useConsistency } from '../../hooks/useConsistency';
import { useMesocycleSummaries } from '../../hooks/useMesocycleSummaries';
import { HeatGrid, LineKey, VerticalBars } from '../../components/charts';
import { Button, Card, CardTitle, EmptyState, ErrorState, SectionLabel, Skeleton, StatRow, StatTile, Tag } from '../../components/ui';
import { SessionRow } from '../../components/session/SessionRow';
import { MesocycleRow } from '../../components/session/MesocycleRow';
import { colors, type } from '../../theme';
import { formatCompact, formatNumber, formatPercent, monthShort } from '../../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STRIP_WEEKS = 26;
const SESSIONS_PAGE = 10;
const MESO_ROWS = 3;

export const HistoryTab: React.FC<{ year: number }> = ({ year }) => {
  const navigation = useNavigation<Nav>();
  const history = useTrainingHistory();
  const consistency = useConsistency(year);
  const mesos = useMesocycleSummaries();
  const [sessionLimit, setSessionLimit] = useState(SESSIONS_PAGE);
  const [allMesos, setAllMesos] = useState(false);
  const { sessions, muscleOf } = history.data;
  const c = consistency.data;

  const strip = useMemo(() => {
    const weeks = recentWeeks(new Date(), STRIP_WEEKS);
    return {
      cells: weeks.map((w) =>
        w.map((d) => ({ date: d ?? new Date(0), level: d ? ((c.levels.get(dayKey(d)) ?? 0) as HeatLevel) : null })),
      ),
      months: monthStarts(weeks).filter((m, i, arr) => i === 0 || m.index - arr[i - 1].index >= 3),
    };
  }, [c.levels]);

  const months = useMemo(() => tonnageByMonth(sessions, year), [sessions, year]);
  const lastFull = [...months].reverse().find((m) => !m.partial && m.tonnage > 0);
  const yearSessions = useMemo(
    () => [...sessions].filter((s) => new Date(s.completedAt).getFullYear() === year).reverse(),
    [sessions, year],
  );
  const totals = useMemo(() => allTimeTotals(sessions), [sessions]);
  const shownMesos = allMesos ? mesos.data : mesos.data.slice(0, MESO_ROWS);

  if (history.error && sessions.length === 0) return <ErrorState onRetry={history.refresh} />;
  if (history.loading && sessions.length === 0) {
    return (
      <>
        <Skeleton height={220} />
        <Skeleton height={220} />
        <Skeleton height={160} />
      </>
    );
  }
  if (sessions.length === 0) return <EmptyState message="Finish a workout and it shows up here." />;

  return (
    <>
      <Card padding={16} gap={14} onPress={() => navigation.navigate('Heatmap', { year })} accessibilityLabel="Consistency. Open the full year">
        <CardTitle
          title="Consistency"
          subtitle={`Last ${STRIP_WEEKS} weeks`}
          right={c.streak > 0 ? <Tag label={`${c.streak} WK STREAK`} tone="success" /> : undefined}
        />
        <HeatGrid weeks={strip.cells} maxCell={12} />
        <View style={styles.monthRow}>
          {strip.months.map((m) => (
            <Text key={`${m.index}-${m.month}`} style={styles.monthLabel}>
              {monthShort(m.month).toUpperCase()}
            </Text>
          ))}
        </View>
        <View style={[styles.statsRow, styles.rule]}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{c.adherence.rate != null ? formatPercent(c.adherence.rate) : '—'}</Text>
            <Text style={styles.statLabel}>Planned days hit</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{c.sessionsPerWeek26 != null ? c.sessionsPerWeek26.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Sessions / week</Text>
          </View>
        </View>
      </Card>

      <Card padding={16} gap={12}>
        <CardTitle title="Tonnage per month" subtitle="Total lb lifted, with 3-month average" />
        <VerticalBars
          bars={months.map((m, i) => ({
            label: monthShort(m.month).toUpperCase(),
            value: m.tonnage,
            partial: m.partial,
            highlight: lastFull?.month === m.month,
            showLabel: i % 3 === 0 || m.partial || i === months.length - 1,
          }))}
          average={months.map((m) => (m.partial ? null : m.avg3))}
          formatY={(v) => (v === 0 ? '0' : formatCompact(v))}
          accessibilityLabel={`Monthly tonnage for ${year}`}
        />
        <LineKey
          items={[
            { kind: 'swatch', label: 'Monthly', color: colors.data.secondary },
            { kind: 'line', label: '3-month average', color: colors.data.average, dashed: true },
          ]}
        />
      </Card>

      {mesos.data.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel
            action={mesos.data.length > MESO_ROWS ? { label: allMesos ? 'Fewer' : `All ${mesos.data.length}`, onPress: () => setAllMesos((v) => !v) } : undefined}
          >
            MESOCYCLES
          </SectionLabel>
          <Card gap={0}>
            {shownMesos.map((m, i) => (
              <MesocycleRow key={m.id} meso={m} divider={i > 0} onPress={() => navigation.navigate('MesocycleDetail', { mesocycleId: m.id })} />
            ))}
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel
          action={
            yearSessions.length > sessionLimit ? { label: `All ${yearSessions.length}`, onPress: () => setSessionLimit(yearSessions.length) } : undefined
          }
        >
          SESSIONS
        </SectionLabel>
        <Card gap={0}>
          {yearSessions.length === 0 ? <Text style={styles.empty}>No sessions in {year}.</Text> : null}
          {yearSessions.slice(0, sessionLimit).map((s, i) => (
            <SessionRow
              key={s.workoutInstanceId}
              session={s}
              sessions={sessions}
              muscleOf={muscleOf}
              divider={i > 0}
              onPress={() => navigation.navigate('PastSession', { workoutInstanceId: s.workoutInstanceId })}
            />
          ))}
        </Card>
        {yearSessions.length > sessionLimit ? (
          <Button label="Show more" variant="secondary" size="small" onPress={() => setSessionLimit((n) => n + SESSIONS_PAGE)} full />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionLabel>ALL TIME</SectionLabel>
        <StatRow>
          <StatTile label="lb lifted" value={formatNumber(totals.tonnage)} />
          <StatTile label="Sets logged" value={formatNumber(totals.sets)} />
        </StatRow>
        <StatRow>
          <StatTile label="Sessions" value={formatNumber(totals.sessions)} />
          <StatTile label="Exercises used" value={formatNumber(totals.exercises)} />
        </StatRow>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.text.faint,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rule: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.dividerAlt,
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  statValue: {
    ...type.stat,
    fontSize: 19,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statLabel: {
    ...type.metaSmall,
    fontSize: 11,
    color: colors.text.muted,
  },
  empty: {
    ...type.meta,
    color: colors.text.muted,
    paddingVertical: 8,
  },
});
