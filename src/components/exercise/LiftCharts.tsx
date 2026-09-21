import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart, LineKey, niceTicks } from '../charts';
import { StatRow, StatTile } from '../ui';
import type { LiftRecords, SeriesPoint } from '../../analytics';
import { colors } from '../../theme';
import { formatMonthDay, formatNumber, formatWeight, monthShort } from '../../utils/format';

/** Month labels for a date range: the first, a middle one and the last. */
export function monthLabels(dates: Date[]): { x: Date; label: string }[] {
  if (dates.length === 0) return [];
  const first = dates[0];
  const last = dates[dates.length - 1];
  const label = (d: Date) => monthShort(d.getMonth()).toUpperCase();
  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) return [{ x: first, label: label(first) }];
  const mid = new Date((first.getTime() + last.getTime()) / 2);
  const out = [{ x: first, label: label(first) }];
  if (label(mid) !== label(first) && label(mid) !== label(last)) out.push({ x: mid, label: label(mid) });
  out.push({ x: last, label: label(last) });
  return out;
}

interface E1rmChartProps {
  series: SeriesPoint[];
  trend: { slope: number; intercept: number } | null;
  name: string;
}

export const E1rmChart: React.FC<E1rmChartProps> = ({ series, trend, name }) => {
  const points = series.map((p) => ({ x: new Date(p.date), y: p.e1rm, isPR: p.isPR }));
  const ys = points.map((p) => p.y);
  const first = ys[0];
  const last = ys[ys.length - 1];
  return (
    <View style={styles.wrap}>
      <LineChart
        points={points}
        trend={trend}
        yTicks={ys.length ? niceTicks(Math.min(...ys), Math.max(...ys), 4) : undefined}
        xLabels={monthLabels(points.map((p) => p.x))}
        accessibilityLabel={
          ys.length > 1
            ? `Estimated one rep max for ${name} going from ${Math.round(first)} to ${Math.round(last)} pounds over ${ys.length} sessions`
            : `Estimated one rep max for ${name}`
        }
      />
      <LineKey
        items={[
          { kind: 'line', label: 'Trend', color: colors.data.reference, dashed: true },
          { kind: 'ring', label: 'Personal record', color: colors.data.main },
        ]}
      />
    </View>
  );
};

/** The 2×2 records grid on Progress and Exercise detail. */
export const RecordTiles: React.FC<{ records: LiftRecords }> = ({ records }) => (
  <View style={styles.grid}>
    <StatRow>
      <StatTile
        labelFirst
        label="Heaviest set"
        value={records.heaviest ? `${formatWeight(records.heaviest.weight)} × ${records.heaviest.reps}` : '—'}
        meta={records.heaviest ? formatMonthDay(records.heaviest.date) : undefined}
      />
      <StatTile
        labelFirst
        label="Most reps"
        value={records.mostReps ? `${records.mostReps.reps} × ${formatWeight(records.mostReps.weight)}` : '—'}
        meta={records.mostReps ? formatMonthDay(records.mostReps.date) : undefined}
      />
    </StatRow>
    <StatRow>
      <StatTile
        labelFirst
        label="Best session volume"
        value={records.bestSessionVolume ? formatNumber(records.bestSessionVolume.volume) : '—'}
        meta={records.bestSessionVolume ? formatMonthDay(records.bestSessionVolume.date) : undefined}
      />
      <StatTile
        labelFirst
        label="Best est. 1RM"
        value={records.bestE1rm ? `${formatNumber(records.bestE1rm.e1rm)} lb` : '—'}
        meta={records.bestE1rm ? formatMonthDay(records.bestE1rm.date) : undefined}
      />
    </StatRow>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  grid: {
    gap: 8,
  },
});
