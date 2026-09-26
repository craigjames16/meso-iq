import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ALL_MUSCLES, LOW_VOLUME_SETS, programDaysFromPlan, programVolumeProfile } from '../../analytics';
import { usePlans } from '../../hooks/usePlans';
import type { MesocycleSummary } from '../../hooks/useMesocycleSummaries';
import { ProfileBars } from '../../components/charts';
import { Card, ChevronGlyph, DeltaText, EmptyState, ErrorState, ListRow, Skeleton, Tag } from '../../components/ui';
import { isEmptyPlan, planCounts, planDayName, sortedDays } from '../../components/plan/planText';
import { features } from '../../config/features';
import { colors, muscleShort, radius, type, size } from '../../theme';
import type { Plan } from '../../types/plan';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ProgramsTabProps {
  mesocycles: MesocycleSummary[];
  onNewProgram: () => void;
}

const ProgramCard: React.FC<{ plan: Plan; running: boolean; cycles: MesocycleSummary[]; onPress: () => void }> = ({
  plan,
  running,
  cycles,
  onPress,
}) => {
  const counts = planCounts(plan);
  const profile = programVolumeProfile(programDaysFromPlan(plan));
  const bars = ALL_MUSCLES.filter((m) => profile[m] > 0).map((m) => ({
    label: muscleShort(m),
    value: profile[m],
    warn: profile[m] < LOW_VOLUME_SETS,
  }));
  const latest = cycles[0];
  return (
    <Card onPress={onPress} accessibilityLabel={`${plan.name}${running ? ', running' : ''}`} gap={12}>
      <View style={styles.head}>
        <Text style={styles.name} numberOfLines={1}>
          {plan.name}
        </Text>
        {running ? <Tag label="RUNNING" tone="success" size="small" /> : null}
        <View style={styles.flex} />
        <ChevronGlyph />
      </View>
      <View style={styles.days}>
        {sortedDays(plan).map((d) => (
          <View key={d.id} style={[styles.day, d.isRestDay && styles.dayRest]}>
            <Text style={[styles.dayText, d.isRestDay && styles.dayRestText]} numberOfLines={1}>
              {planDayName(d)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.meta}>
        {counts.training} training {counts.training === 1 ? 'day' : 'days'} · {counts.exercises} {counts.exercises === 1 ? 'exercise' : 'exercises'}
      </Text>
      {bars.length > 0 ? <ProfileBars bars={bars} height={28} /> : null}
      {cycles.length > 0 ? (
        <View style={styles.runs}>
          <Text style={styles.meta}>
            {cycles.length} {cycles.length === 1 ? 'cycle' : 'cycles'} run
          </Text>
          {latest?.avgE1rm != null ? (
            <View style={styles.outcome}>
              <Text style={styles.meta}>last</Text>
              <DeltaText value={latest.avgE1rm} suffix="avg e1RM" />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
};

export const ProgramsTab: React.FC<ProgramsTabProps> = ({ mesocycles, onNewProgram }) => {
  const navigation = useNavigation<Nav>();
  const plans = usePlans();
  const runningPlanIds = new Set(mesocycles.filter((m) => m.status === 'IN_PROGRESS').map((m) => m.planId));

  if (plans.error && plans.data.length === 0) return <ErrorState onRetry={plans.refresh} />;
  if (plans.loading && plans.data.length === 0) {
    return (
      <>
        <Skeleton height={170} />
        <Skeleton height={170} />
      </>
    );
  }
  if (plans.data.length === 0) {
    return <EmptyState message="No programs yet" action={{ label: 'New program', onPress: onNewProgram }} />;
  }

  const programs = plans.data.filter((p) => !isEmptyPlan(p));
  const drafts = plans.data.filter(isEmptyPlan);

  return (
    <>
      {programs.map((p) => (
        <ProgramCard
          key={p.id}
          plan={p}
          running={runningPlanIds.has(p.id)}
          cycles={mesocycles.filter((m) => m.planId === p.id)}
          onPress={() => navigation.navigate('PlanDetail', { planId: p.id })}
        />
      ))}
      {drafts.length > 0 ? (
        <Card variant="subtle" padding={14} gap={0}>
          <ListRow
            title={`${drafts.length} empty ${drafts.length === 1 ? 'draft' : 'drafts'}`}
            meta={drafts.map((d) => `“${d.name}”`).join(', ')}
            right={features.PLAN_DELETE ? <Text style={styles.cleanUp}>Clean up</Text> : undefined}
            chevron={drafts.length === 1}
            onPress={drafts.length === 1 ? () => navigation.navigate('EditPlan', { planId: drafts[0].id }) : undefined}
          />
        </Card>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  name: {
    ...type.cardTitle,
    fontSize: size.title,
    color: colors.text.primary,
    flexShrink: 1,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  day: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: radius.tag,
    backgroundColor: colors.surface.field,
  },
  dayRest: {
    backgroundColor: colors.surface.subtle,
  },
  dayText: {
    ...type.caption,
    color: colors.text.body,
  },
  dayRestText: {
    color: colors.text.disabled,
  },
  meta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  runs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.dividerAlt,
  },
  outcome: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  cleanUp: {
    ...type.buttonSmall,
    color: colors.text.body,
  },
});
