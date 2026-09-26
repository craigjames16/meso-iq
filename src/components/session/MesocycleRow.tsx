import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeltaText, ListRow, Tag } from '../ui';
import { colors, type, size } from '../../theme';
import { formatMonthDay, formatPercent } from '../../utils/format';
import type { MesocycleSummary } from '../../hooks/useMesocycleSummaries';

/** "Aug 24 – now · 11 of 15 days" for a running cycle, "Jun 15 – Aug 16 · 88% adherence" for a finished one. */
export function mesocycleMeta(m: MesocycleSummary): string {
  const start = m.startedAt ? formatMonthDay(m.startedAt) : null;
  if (m.status === 'IN_PROGRESS') {
    return [start ? `${start} – now` : null, `${m.daysLogged} of ${m.daysTotal} days`].filter(Boolean).join(' · ');
  }
  if (m.status === 'COMPLETE') {
    const end = m.completedAt ? formatMonthDay(m.completedAt) : null;
    return [start && end ? `${start} – ${end}` : start, m.adherence != null ? `${formatPercent(m.adherence)} adherence` : null]
      .filter(Boolean)
      .join(' · ');
  }
  return `Not started · ${m.iterations} weeks`;
}

export const MesocycleRow: React.FC<{ meso: MesocycleSummary; onPress: () => void; divider?: boolean; showPlan?: boolean }> = ({
  meso,
  onPress,
  divider,
  showPlan = true,
}) => (
  <ListRow
    title={showPlan && meso.planName ? `${meso.name} · ${meso.planName}` : meso.name}
    titleAccessory={meso.status === 'IN_PROGRESS' ? <Tag label="ACTIVE" tone="success" size="small" /> : undefined}
    meta={mesocycleMeta(meso)}
    right={
      meso.avgE1rm != null ? (
        <View style={styles.right}>
          <DeltaText value={meso.avgE1rm} />
          <Text style={styles.label}>avg e1RM</Text>
        </View>
      ) : undefined
    }
    onPress={onPress}
    divider={divider}
    chevron
  />
);

const styles = StyleSheet.create({
  right: {
    alignItems: 'flex-end',
    gap: 1,
  },
  label: {
    ...type.caption,
    fontSize: size.tag,
    color: colors.text.faint,
  },
});
