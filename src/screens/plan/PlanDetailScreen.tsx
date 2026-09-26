import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { plansService } from '../../services/plansService';
import type { Plan, PlanDay } from '../../types/plan';
import { ALL_MUSCLES, LOW_VOLUME_SETS, programDaysFromPlan, programVolumeProfile, repRangeLabel, toMuscle } from '../../analytics';
import { useMesocycleSummaries } from '../../hooks/useMesocycleSummaries';
import { ProfileBars } from '../../components/charts';
import { Button, Card, ChevronGlyph, DetailHeader, ErrorState, PlayGlyph, Screen, SectionLabel, Skeleton, Tag } from '../../components/ui';
import { StartCycleSheet } from '../../components/plan/StartCycleSheet';
import { MesocycleRow } from '../../components/session/MesocycleRow';
import { planCounts, planDayName, sortedDays } from '../../components/plan/planText';
import { features } from '../../config/features';
import { colors, muscleLabel, muscleShort, radius, type } from '../../theme';

type Route = RouteProp<RootStackParamList, 'PlanDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'PlanDetail'>;

type WeekRow = { kind: 'day'; day: PlanDay } | { kind: 'rest'; days: PlanDay[] };

/** Training days as cards; runs of rest days collapse into one row. */
function weekRows(days: PlanDay[]): WeekRow[] {
  const rows: WeekRow[] = [];
  for (const d of days) {
    const last = rows[rows.length - 1];
    if (d.isRestDay && last?.kind === 'rest') last.days.push(d);
    else if (d.isRestDay) rows.push({ kind: 'rest', days: [d] });
    else rows.push({ kind: 'day', day: d });
  }
  return rows;
}

function restLabel(days: PlanDay[]): string {
  const n = days.map((d) => d.dayNumber);
  if (n.length === 1) return `Day ${n[0]}`;
  return `Days ${n.slice(0, -1).join(', ')} & ${n[n.length - 1]}`;
}

export const PlanDetailScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const mesos = useMesocycleSummaries();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPlan(await plansService.getPlan(params.planId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this.");
    }
  }, [params.planId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const running = mesos.data.find((m) => m.status === 'IN_PROGRESS') ?? null;
  const cycles = mesos.data.filter((m) => m.planId === params.planId);

  if (!plan) {
    return (
      <Screen bottom="none">
        <DetailHeader title="Program" onBack={() => navigation.goBack()} />
        {error ? <ErrorState onRetry={load} /> : <Skeleton height={400} />}
      </Screen>
    );
  }

  const counts = planCounts(plan);
  const profile = programVolumeProfile(programDaysFromPlan(plan));
  const days = sortedDays(plan);

  return (
    <Screen bottom="none" refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.text.secondary} />}>
      <DetailHeader
        title={plan.name}
        meta={`${counts.training} training ${counts.training === 1 ? 'day' : 'days'} · ${counts.rest} rest · ${counts.exercises} exercises`}
        onBack={() => navigation.goBack()}
        action={{ label: 'Edit', onPress: () => navigation.navigate('EditPlan', { planId: plan.id }) }}
      />

      <Card padding={16} gap={12}>
        <SectionLabel info="volumeProfile">STARTING SETS PER MUSCLE · WEEK 1</SectionLabel>
        <ProfileBars
          bars={ALL_MUSCLES.map((m) => ({ label: muscleShort(m), value: profile[m], warn: profile[m] > 0 && profile[m] < LOW_VOLUME_SETS }))}
        />
      </Card>

      <View style={styles.startWrap}>
        <Button
          label="Start a cycle from this"
          icon={<PlayGlyph size={17} />}
          onPress={() => setStartOpen(true)}
          disabled={!!running || counts.exercises === 0}
          full
        />
        {running ? <Text style={styles.caption}>Finish {running.name} first.</Text> : null}
      </View>

      <SectionLabel>THE WEEK</SectionLabel>
      {weekRows(days).map((row) => {
        if (row.kind === 'rest') {
          return (
            <View key={`rest-${row.days[0].id}`} style={styles.rest}>
              <Text style={styles.restText}>{restLabel(row.days)} Rest</Text>
            </View>
          );
        }
        const d = row.day;
        const exercises = [...(d.workout?.workoutExercises ?? [])].sort((a, b) => a.order - b.order);
        const muscles = [...new Set(exercises.map((we) => toMuscle(we.exercise.category)).filter(Boolean))];
        const open = expanded === d.id;
        return (
          <Card key={d.id} gap={10}>
            <Pressable
              onPress={() => setExpanded(open ? null : d.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={styles.dayHead}
            >
              <View style={styles.dayNum}>
                <Text style={styles.dayNumText}>{d.dayNumber}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.dayName}>{planDayName(d)}</Text>
                <Text style={styles.meta}>
                  {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>
              <ChevronGlyph direction={open ? 'down' : 'right'} />
            </Pressable>
            {muscles.length > 0 ? (
              <View style={styles.tags}>
                {muscles.map((m) => (
                  <Tag key={m} label={muscleLabel(m!)} size="small" />
                ))}
              </View>
            ) : null}
            {open ? (
              <View>
                {exercises.map((we, i) => {
                  const range = repRangeLabel(we.repMin, we.repMax);
                  return (
                    <View key={we.id} style={[styles.exRow, i > 0 && styles.divider]}>
                      <Text style={styles.exName}>{we.exercise.name}</Text>
                      {features.PROGRAM_TARGETS && range ? (
                        <Text style={styles.meta}>
                          {we.startingSets ?? 2} × {range}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Card>
        );
      })}

      {cycles.length > 0 ? (
        <>
          <SectionLabel>CYCLES</SectionLabel>
          <Card gap={0}>
            {cycles.map((m, i) => (
              <MesocycleRow
                key={m.id}
                meso={m}
                showPlan={false}
                divider={i > 0}
                onPress={() => navigation.navigate('MesocycleDetail', { mesocycleId: m.id })}
              />
            ))}
          </Card>
        </>
      ) : null}

      <StartCycleSheet
        visible={startOpen}
        onClose={() => setStartOpen(false)}
        plan={plan}
        onStarted={() => {
          setStartOpen(false);
          navigation.navigate('Main', { screen: 'Track' });
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  startWrap: { gap: 6 },
  caption: { ...type.metaSmall, color: colors.text.muted, textAlign: 'center' },
  rest: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    backgroundColor: colors.surface.subtle,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  restText: { ...type.meta, color: colors.text.faint },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  dayNum: {
    width: 28,
    height: 28,
    borderRadius: radius.badge,
    backgroundColor: colors.surface.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: { ...type.tag, color: colors.text.secondary },
  dayName: { ...type.cardTitle, color: colors.text.primary },
  meta: { ...type.metaSmall, color: colors.text.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.divider },
  exName: { ...type.body, color: colors.text.body, flexShrink: 1 },
});
