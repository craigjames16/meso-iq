import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, CardTitle } from '../ui';
import { colors, glass, radius, tabularNums, type, size } from '../../theme';
import { weekdayLong, weekdayShort } from '../../utils/format';

export interface WeekCell {
  dayNumber: number;
  state: 'done' | 'today' | 'rest' | 'planned' | 'missed';
  /** Working sets when done. */
  sets?: number;
  name: string;
  /** The day this slot fell on, or is expected to fall on. Null when unknown. */
  date?: Date | null;
  /** True when `date` is projected forward rather than read from a finished session. */
  projected?: boolean;
}

export const ThisWeek: React.FC<{ cells: WeekCell[]; done: number; total: number }> = ({ cells, done, total }) => (
  <Card padding={16} gap={13}>
    <CardTitle title="This week" right={<Text style={styles.count}>{`${done} of ${total} done`}</Text>} />
    <View style={styles.row}>
      {cells.map((c) => {
        // Done days lead with their working-set count; others lead with the day's name.
        const top = c.state === 'done' ? String(c.sets ?? 0) : c.state === 'rest' ? '—' : c.name;
        const bottom = { done: c.name, rest: 'Rest', today: 'Today', planned: 'Plan', missed: 'Missed' }[c.state];
        // Plan days are slots in a rotation, so a weekday is known for finished
        // days and projected for the rest. Fall back to the slot number.
        const weekday = c.date ? weekdayShort(c.date.getDay()).toUpperCase() : String(c.dayNumber);
        const when = c.date ? `${c.projected ? 'expected ' : ''}${weekdayLong(c.date.getDay())}` : '';
        return (
          <View
            key={c.dayNumber}
            style={styles.col}
            accessible
            accessibilityLabel={[
              `Day ${c.dayNumber}`,
              when,
              c.state === 'done' ? `${c.name}, ${c.sets} working sets` : `${top}, ${bottom}`,
            ]
              .filter(Boolean)
              .join(', ')}
          >
            <Text style={styles.letter} numberOfLines={1}>
              {weekday}
            </Text>
            <View style={[styles.cell, styles[c.state]]}>
              <Text style={[styles.top, topStyle[c.state]]} numberOfLines={1}>
                {top}
              </Text>
              <Text style={[styles.bottom, bottomStyle[c.state]]} numberOfLines={1}>
                {bottom}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  </Card>
);

const styles = StyleSheet.create({
  count: {
    ...type.metaSmall,
    fontSize: size.metaMid,
    color: colors.text.muted,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  letter: {
    ...type.caption,
    color: colors.text.faint,
    ...tabularNums,
  },
  cell: {
    alignSelf: 'stretch',
    minHeight: 54,
    paddingVertical: 4,
    borderRadius: radius.field,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  done: {
    backgroundColor: colors.success.pillBg,
    borderColor: colors.success.pillBorder,
  },
  today: {
    backgroundColor: glass.todayFill,
    borderColor: colors.action.fill,
    borderWidth: 2,
  },
  rest: {
    backgroundColor: colors.surface.subtle,
    borderColor: colors.border.divider,
  },
  planned: {
    backgroundColor: 'transparent',
    borderColor: colors.border.stronger,
    borderStyle: 'dashed',
  },
  missed: {
    backgroundColor: colors.surface.subtle,
    borderColor: colors.danger.border,
  },
  top: {
    ...type.metaSmall,
    fontWeight: '600',
    ...tabularNums,
  },
  bottom: {
    fontSize: size.tiny,
  },
});

const topStyle = StyleSheet.create({
  done: { color: colors.success.pillText },
  today: { color: colors.text.primary },
  rest: { color: colors.text.disabled },
  planned: { color: colors.text.muted },
  missed: { color: colors.danger.base },
});

const bottomStyle = StyleSheet.create({
  done: { color: colors.success.lastText },
  today: { color: colors.text.body },
  rest: { color: colors.text.disabled },
  planned: { color: colors.text.disabled },
  missed: { color: colors.text.faint },
});
