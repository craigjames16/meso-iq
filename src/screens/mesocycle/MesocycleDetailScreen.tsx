import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { mesocyclesService } from '../../services/mesocyclesService';
import { useCycleStats, type CycleDay } from '../../hooks/useCycleStats';
import { invalidateMesocycles } from '../../hooks/mesocycleData';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import {
  Button,
  Card,
  ChevronGlyph,
  DetailHeader,
  ErrorState,
  Screen,
  SectionLabel,
  Skeleton,
  StatRow,
  StatTile,
  Tag,
  deltaColor,
} from '../../components/ui';
import { sessionName } from '../../components/session/sessionText';
import { colors, radius, type } from '../../theme';
import { formatMonthDay, formatNumber, formatPercent, formatPercentDelta } from '../../utils/format';

type Route = RouteProp<RootStackParamList, 'MesocycleDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'MesocycleDetail'>;

const STATE_LABEL: Record<CycleDay['state'], string> = {
  done: 'Done',
  missed: 'Missed',
  upcoming: 'Upcoming',
  rest: 'Rest',
};

export const MesocycleDetailScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const stats = useCycleStats(params.mesocycleId);
  const history = useTrainingHistory();
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const d = stats.data;
  const detail = d.detail;

  if (!detail) {
    return (
      <Screen bottom="none">
        <DetailHeader title="Mesocycle" onBack={() => navigation.goBack()} />
        {stats.error ? <ErrorState onRetry={stats.refresh} /> : <Skeleton height={400} />}
      </Screen>
    );
  }

  const running = detail.status === 'IN_PROGRESS';
  const done = detail.status === 'COMPLETE';
  const expanded = open ?? d.weeks.find((w) => w.isCurrent)?.iteration ?? null;
  const pct = d.daysTotal > 0 ? d.daysLogged / d.daysTotal : 0;

  const finishEarly = () =>
    Alert.alert(`Finish ${detail.name} early?`, 'The cycle is marked complete. Logged sessions stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish cycle',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await mesocyclesService.completeMesocycle(detail.id);
            invalidateMesocycles(detail.id);
          } catch (err) {
            Alert.alert("Couldn't finish the cycle", err instanceof Error ? err.message : 'Try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const remove = () => {
    const n = d.sessions.length;
    Alert.alert(
      `Delete ${detail.name}?`,
      n > 0
        ? `It has ${n} logged ${n === 1 ? 'session' : 'sessions'}. Deleting the cycle can't be undone.`
        : "Deleting the cycle can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await mesocyclesService.deleteMesocycle(detail.id);
              invalidateMesocycles();
              navigation.goBack();
            } catch (err) {
              Alert.alert("Couldn't delete the cycle", err instanceof Error ? err.message : 'Try again.');
            }
          },
        },
      ],
    );
  };

  const openDay = (day: CycleDay) => {
    if (!day.workoutInstanceId) return;
    if (day.state === 'done') navigation.navigate('PastSession', { workoutInstanceId: day.workoutInstanceId });
    else navigation.navigate('WorkoutDetail', { workoutInstanceId: day.workoutInstanceId });
  };

  return (
    <Screen bottom="none" refreshControl={<RefreshControl refreshing={false} onRefresh={stats.refresh} tintColor={colors.text.secondary} />}>
      <DetailHeader
        title={detail.name}
        titleAccessory={running ? <Tag label="RUNNING" tone="success" /> : done ? <Tag label="DONE" /> : <Tag label="NOT STARTED" />}
        meta={[detail.plan?.name, detail.startedAt ? `started ${formatMonthDay(detail.startedAt)}` : null, `${detail.iterations} weeks`]
          .filter(Boolean)
          .join(' · ')}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.progress}>
        <View style={styles.progressHead}>
          <Text style={styles.progressText}>
            {d.daysLogged} of {d.daysTotal} days logged
          </Text>
          <Text style={styles.meta}>{done ? 'Complete' : `Week ${d.currentWeek} of ${detail.iterations}`}</Text>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: d.daysTotal, now: d.daysLogged }}>
          <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
      </View>

      <StatRow>
        <StatTile label="Adherence" value={d.adherence.rate != null ? formatPercent(d.adherence.rate) : '—'} empty={d.adherence.rate == null} />
        <StatTile
          label="Avg e1RM"
          value={d.e1rmDelta.average != null ? formatPercentDelta(d.e1rmDelta.average) : '—'}
          valueColor={d.e1rmDelta.average != null ? deltaColor(d.e1rmDelta.average) : undefined}
          empty={d.e1rmDelta.average == null}
        />
      </StatRow>

      <SectionLabel>WEEK BY WEEK</SectionLabel>
      {d.weeks.map((w) => {
        const isOpen = expanded === w.iteration;
        return (
          <Card key={w.iteration} gap={8} padding={14}>
            <Pressable
              onPress={() => setOpen(isOpen ? -1 : w.iteration)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              style={styles.weekHead}
            >
              <Text style={styles.weekTitle}>Week {w.iteration}</Text>
              {w.rir != null ? <Tag label={`RIR ${w.rir}`} size="small" /> : null}
              <View style={styles.flex} />
              <Text style={styles.meta}>
                {w.tonnage > 0 ? `${formatNumber(w.tonnage)} lb${w.isCurrent ? ' so far' : ''}` : '—'}
              </Text>
              <ChevronGlyph direction={isOpen ? 'down' : 'right'} />
            </Pressable>
            {isOpen
              ? w.days.map((day) => {
                  const session = day.workoutInstanceId ? d.sessionById.get(day.workoutInstanceId) : undefined;
                  const name = day.isRestDay ? 'Rest' : session ? sessionName(session, history.data.muscleOf, day.dayNumber) : `Day ${day.dayNumber}`;
                  const tappable = !!day.workoutInstanceId;
                  return (
                    <Pressable
                      key={day.dayNumber}
                      onPress={() => openDay(day)}
                      disabled={!tappable}
                      accessibilityRole={tappable ? 'button' : undefined}
                      style={styles.dayRow}
                    >
                      <View style={[styles.dot, styles[day.state]]} />
                      <Text style={styles.dayName} numberOfLines={1}>
                        Day {day.dayNumber} · {name}
                      </Text>
                      <Text style={[styles.meta, day.state === 'missed' && styles.missedText]}>
                        {day.workoutInstanceId && day.state !== 'done' ? 'In progress' : STATE_LABEL[day.state]}
                      </Text>
                      {tappable ? <ChevronGlyph /> : null}
                    </Pressable>
                  );
                })
              : null}
          </Card>
        );
      })}

      <View style={styles.actions}>
        {running ? <Button label="Finish cycle early" variant="secondary" onPress={finishEarly} loading={busy} full /> : null}
        <Button label="Delete" variant="danger" onPress={remove} full />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { gap: 8 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressText: { ...type.bodyStrong, color: colors.text.primary },
  meta: { ...type.metaSmall, color: colors.text.muted },
  track: { height: 4, borderRadius: radius.cell, backgroundColor: colors.border.track, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.success.base },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  weekTitle: { ...type.cardTitle, color: colors.text.primary },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  dot: { width: 8, height: 8, borderRadius: radius.round },
  done: { backgroundColor: colors.success.base },
  missed: { backgroundColor: colors.danger.base },
  upcoming: { borderWidth: 1, borderColor: colors.border.stronger },
  rest: { backgroundColor: colors.surface.field },
  dayName: { flex: 1, ...type.body, color: colors.text.body },
  missedText: { color: colors.danger.base },
  actions: { gap: 8, marginTop: 6 },
});
