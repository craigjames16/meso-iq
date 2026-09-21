import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { dayKey, monthGrid, type HeatLevel, type Session } from '../../analytics';
import { useConsistency } from '../../hooks/useConsistency';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { HeatGrid } from '../../components/charts';
import { Card, Chip, DetailHeader, ErrorState, Screen, Sheet, Skeleton, StatRow, StatTile } from '../../components/ui';
import { SessionRow } from '../../components/session/SessionRow';
import { colors, radius, type } from '../../theme';
import { formatFullDate, formatPercent, monthShort } from '../../utils/format';

type Route = RouteProp<RootStackParamList, 'Heatmap'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Heatmap'>;

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

/** Full-year consistency: twelve month calendars shaded by hard sets. */
export const HeatmapScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const [year, setYear] = useState(params?.year ?? new Date().getFullYear());
  const [daySessions, setDaySessions] = useState<Session[] | null>(null);
  const consistency = useConsistency(year);
  const history = useTrainingHistory();
  const c = consistency.data;
  const today = new Date();

  const calendars = useMemo(
    () =>
      MONTHS.map((m) => ({
        month: m,
        future: year > today.getFullYear() || (year === today.getFullYear() && m > today.getMonth()),
        rows: monthGrid(year, m).map((row) =>
          row.map((d) => ({ date: d ?? new Date(0), level: d ? ((c.levels.get(dayKey(d)) ?? 0) as HeatLevel) : null })),
        ),
      })),
    // `today` only changes across midnight; the year and levels drive this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, c.levels],
  );

  const cycleYear = () => {
    const years = c.years;
    const i = years.indexOf(year);
    setYear(years[(i + 1) % years.length] ?? year);
  };

  const openDay = (date: Date) => {
    const list = c.sessionsByDay.get(dayKey(date)) ?? [];
    if (list.length === 1) navigation.navigate('PastSession', { workoutInstanceId: list[0].workoutInstanceId });
    else if (list.length > 1) setDaySessions(list);
  };

  return (
    <Screen bottom="none">
      <DetailHeader
        title="Consistency"
        onBack={() => navigation.goBack()}
        titleAccessory={
          c.years.length > 1 ? (
            <Chip label={String(year)} dropdown onPress={cycleYear} accessibilityLabel={`Year ${year}. Show another year`} />
          ) : (
            <Chip label={String(year)} />
          )
        }
      />
      {consistency.error && history.data.sessions.length === 0 ? <ErrorState onRetry={consistency.refresh} /> : null}
      <StatRow>
        <StatTile label="Sessions" value={String(c.sessionsInYear)} />
        <StatTile label="Current streak" value={`${c.streak} wk`} />
        <StatTile label="Planned days hit" value={c.adherence.rate != null ? formatPercent(c.adherence.rate) : '—'} />
      </StatRow>
      {consistency.loading && history.data.sessions.length === 0 ? (
        <Skeleton height={520} />
      ) : (
        <Card padding={14} gap={14}>
          <View style={styles.grid}>
            {calendars.map((cal) => (
              <View key={cal.month} style={styles.month}>
                <Text style={[styles.monthLabel, cal.future && styles.monthFuture]}>{monthShort(cal.month).toUpperCase()}</Text>
                <HeatGrid weeks={cal.rows} orientation="rows" onPressDay={openDay} maxCell={18} />
              </View>
            ))}
          </View>
          <View style={styles.key}>
            <Text style={styles.keyLabel}>Rest</Text>
            {colors.data.heat.map((c2) => (
              <View key={c2} style={[styles.swatch, { backgroundColor: c2 }]} />
            ))}
            <Text style={styles.keyLabel}>Big day</Text>
          </View>
          <Text style={styles.caption}>Shade is that day's hard sets. Tap a day to open the session.</Text>
        </Card>
      )}

      <Sheet
        visible={daySessions != null}
        onClose={() => setDaySessions(null)}
        title={daySessions?.[0] ? formatFullDate(daySessions[0].completedAt) : ''}
        subtitle={`${daySessions?.length ?? 0} sessions`}
      >
        <View>
          {(daySessions ?? []).map((s, i) => (
            <SessionRow
              key={s.workoutInstanceId}
              session={s}
              sessions={history.data.sessions}
              muscleOf={history.data.muscleOf}
              divider={i > 0}
              onPress={() => {
                setDaySessions(null);
                navigation.navigate('PastSession', { workoutInstanceId: s.workoutInstanceId });
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    columnGap: 14,
  },
  month: {
    width: '46%',
    flexGrow: 1,
    gap: 6,
  },
  monthLabel: {
    ...type.label,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: colors.text.body,
  },
  monthFuture: {
    color: colors.text.disabled,
  },
  key: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keyLabel: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: radius.cell,
  },
  caption: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
});
