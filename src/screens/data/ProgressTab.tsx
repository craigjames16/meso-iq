import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ALL_MUSCLES,
  MATRIX_REP_COLS,
  REP_BUCKETS,
  rangePhrase,
  type TimeRange,
} from '../../analytics';
import { useProgress } from '../../hooks/useProgress';
import { useExerciseProgress } from '../../hooks/useExerciseProgress';
import { BarRow, Matrix } from '../../components/charts';
import { E1rmChart, RecordTiles } from '../../components/exercise/ExerciseCharts';
import { ExercisePickerSheet } from '../../components/exercise/ExercisePickerSheet';
import {
  Card,
  CardTitle,
  ChevronGlyph,
  EmptyState,
  ErrorState,
  InfoButton,
  NotEnough,
  SectionLabel,
  Skeleton,
  deltaColor,
} from '../../components/ui';
import { colors, muscleLabel, type, size } from '../../theme';
import { formatNumber, formatPercent, formatPercentDelta, formatSigned, formatWeight, monthLong } from '../../utils/format';

interface ProgressTabProps {
  range: TimeRange;
}

export const ProgressTab: React.FC<ProgressTabProps> = ({ range }) => {
  const progress = useProgress(range);
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const options = progress.data.exercises;

  // Default to the exercise with the most sessions in the range.
  useEffect(() => {
    if (options.length === 0) return;
    if (exerciseId == null || !options.some((o) => o.id === exerciseId)) setExerciseId(options[0].id);
  }, [options, exerciseId]);

  const exercise = useExerciseProgress(exerciseId, range);

  if (progress.error && options.length === 0) return <ErrorState onRetry={progress.refresh} />;
  if (progress.loading && options.length === 0) {
    return (
      <>
        <Skeleton height={300} />
        <Skeleton height={150} />
      </>
    );
  }
  if (options.length === 0) return <EmptyState message="Log a few sessions to see your progress." />;

  const selected = options.find((o) => o.id === exerciseId) ?? options[0];
  const l = exercise.data;
  const series = l.series;
  const current = series[series.length - 1]?.e1rm ?? null;
  const first = series[0]?.e1rm ?? null;
  const change = current != null && first != null && series.length > 1 ? current - first : null;
  const since = series.length ? monthLong(new Date(series[0].date).getMonth()) : null;

  const overload = ALL_MUSCLES.map((m) => ({ muscle: m, rate: progress.data.overload[m] })).filter(
    (r) => r.rate != null || options.some((o) => o.muscle === r.muscle),
  );
  const rates = overload.map((r) => r.rate ?? 0);
  const lo = Math.min(0, ...rates);
  const hi = Math.max(0, ...rates);
  const pad = Math.max(0.002, (hi - lo) * 0.1);

  return (
    <>
      <View style={styles.section}>
        <SectionLabel>THIS EXERCISE</SectionLabel>
        <Card padding={16} gap={12}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${selected.name}. Change exercise`}
            style={styles.picker}
          >
            <View style={styles.pickerText}>
              <Text style={styles.exercise}>{selected.name}</Text>
              <Text style={styles.meta}>
                Est. 1RM · {series.length} {series.length === 1 ? 'session' : 'sessions'}
                {since ? ` since ${since}` : ''}
              </Text>
            </View>
            <ChevronGlyph color={colors.text.secondary} size={16} />
          </Pressable>
          {exercise.loading && series.length === 0 ? (
            <Skeleton height={220} rounded="tile" />
          ) : series.length === 0 ? (
            <NotEnough />
          ) : (
            <>
              <View style={styles.heroRow}>
                <Text style={styles.hero}>{formatNumber(current!)}</Text>
                <Text style={styles.unit}>lb</Text>
                {change != null && first ? (
                  <Text style={[styles.change, { color: deltaColor(change / first) }]}>
                    {formatSigned(change)} lb ({formatPercentDelta(change / first, 0)})
                  </Text>
                ) : null}
                <View style={styles.infoRight}>
                  <InfoButton id="e1rm" />
                </View>
              </View>
              <E1rmChart series={series} trend={l.trend} name={selected.name} />
            </>
          )}
        </Card>
      </View>

      {l.sessions.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>RECORDS</SectionLabel>
          <RecordTiles records={l.records} />
        </View>
      ) : null}

      {l.matrix.rows.length > 0 ? (
        <Card padding={16} gap={12}>
          <CardTitle title="Where you actually train" subtitle={`${selected.name}, darker is more often`} info="weightRepMatrix" />
          <Matrix
            rows={l.matrix.rows.map(formatWeight)}
            cols={[...MATRIX_REP_COLS]}
            cells={l.matrix.levels}
            counts={l.matrix.counts}
          />
          {l.matrixCaption ? <Text style={[styles.caption, styles.rule]}>{l.matrixCaption}</Text> : null}
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>ACROSS ALL EXERCISES</SectionLabel>
        <Card padding={16} gap={12}>
          <CardTitle title="Rep ranges" subtitle="Share of your working sets" info="repRanges" />
          {progress.data.hardSetsInRange === 0 ? (
            <NotEnough />
          ) : (
            <View style={styles.bars}>
              {REP_BUCKETS.map((b) => (
                <BarRow
                  key={b}
                  label={b}
                  labelWidth={48}
                  height={12}
                  value={progress.data.repRanges[b]}
                  max={1}
                  valueLabel={formatPercent(progress.data.repRanges[b])}
                />
              ))}
            </View>
          )}
        </Card>
      </View>

      <Card padding={16} gap={12}>
        <CardTitle title="Overload rate by muscle" subtitle={`Est. 1RM change per week · ${rangePhrase(range)}`} info="overload" />
        {!progress.data.complete && overload.every((r) => r.rate == null) ? (
          <Skeleton height={160} rounded="tile" />
        ) : (
          <View style={styles.bars}>
            {overload.map((r) =>
              r.rate == null ? (
                <View key={r.muscle} style={styles.nullRow}>
                  <Text style={styles.nullLabel}>{muscleLabel(r.muscle).toUpperCase()}</Text>
                  <Text style={styles.nullText}>Not enough sessions</Text>
                </View>
              ) : (
                <BarRow
                  key={r.muscle}
                  label={muscleLabel(r.muscle).toUpperCase()}
                  labelWidth={78}
                  height={12}
                  value={r.rate}
                  min={lo - pad}
                  max={hi + pad}
                  color={r.rate >= 0 ? colors.data.main : colors.data.reference}
                  valueLabel={formatPercentDelta(r.rate)}
                  valueColor={r.rate >= 0 ? colors.data.main : colors.text.muted}
                />
              ),
            )}
          </View>
        )}
        <Text style={[styles.caption, styles.rule]}>Slope of a fit through each muscle's est. 1RM series.</Text>
      </Card>

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={options.map((o) => ({
          id: o.id,
          name: o.name,
          muscle: o.muscle,
          meta: `${o.sessionsInRange} ${o.sessionsInRange === 1 ? 'session' : 'sessions'}`,
        }))}
        value={selected.id}
        onChange={setExerciseId}
      />
    </>
  );
};

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 44,
  },
  pickerText: {
    flex: 1,
    gap: 3,
  },
  exercise: {
    ...type.cardTitle,
    fontSize: size.title,
    color: colors.text.primary,
  },
  meta: {
    ...type.metaSmall,
    fontSize: size.metaMid,
    color: colors.text.muted,
  },
  infoRight: {
    marginLeft: 'auto',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    flexWrap: 'wrap',
  },
  hero: {
    ...type.hero,
    fontSize: size.heroLarge,
    color: colors.text.primary,
  },
  unit: {
    ...type.body,
    color: colors.text.muted,
  },
  change: {
    ...type.bodyStrong,
  },
  section: {
    gap: 8,
  },
  bars: {
    gap: 8,
  },
  caption: {
    ...type.metaSmall,
    lineHeight: 17,
    color: colors.text.muted,
  },
  rule: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.dividerAlt,
  },
  nullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 22,
  },
  nullLabel: {
    width: 78,
    ...type.metaSmall,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.text.secondary,
  },
  nullText: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
});
