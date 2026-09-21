import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';
import { useWidth } from './useWidth';

export type HeatLevel = 0 | 1 | 2 | 3;
export interface HeatCell {
  date: Date;
  level: HeatLevel | null;
}

interface HeatGridProps {
  /** Columns of cells. Each column is one week, Monday first, or one calendar row when `orientation` is 'rows'. */
  weeks: HeatCell[][];
  onPressDay?: (date: Date) => void;
  /** 'columns' draws each week top to bottom (the 26-week strip); 'rows' draws each week left to right (month calendars). */
  orientation?: 'columns' | 'rows';
  gap?: number;
  width?: number;
  maxCell?: number;
}

export const HeatGrid: React.FC<HeatGridProps> = ({
  weeks,
  onPressDay,
  orientation = 'columns',
  gap = 2,
  width: fixedWidth,
  maxCell = 16,
}) => {
  const [width, onLayout] = useWidth(fixedWidth);
  const across = orientation === 'columns' ? weeks.length : Math.max(0, ...weeks.map((w) => w.length));
  const cell = across > 0 && width > 0 ? Math.min(maxCell, Math.floor((width - gap * (across - 1)) / across)) : 0;

  const renderCell = (c: HeatCell, key: string) => {
    const style = [
      styles.cell,
      { width: cell, height: cell },
      c.level == null ? styles.outside : { backgroundColor: colors.data.heat[c.level] },
    ];
    if (onPressDay && c.level != null && c.level > 0) {
      return (
        <Pressable
          key={key}
          onPress={() => onPressDay(c.date)}
          accessibilityRole="button"
          accessibilityLabel={c.date.toDateString()}
          hitSlop={4}
          style={style}
        />
      );
    }
    return <View key={key} style={style} />;
  };

  return (
    <View onLayout={onLayout}>
      {cell > 0 ? (
        <View style={[orientation === 'columns' ? styles.row : styles.col, { gap }]}>
          {weeks.map((week, wi) => (
            <View key={wi} style={[orientation === 'columns' ? styles.col : styles.row, { gap }]}>
              {week.map((c, di) => renderCell(c, `${wi}-${di}`))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
  },
  cell: {
    borderRadius: radius.cell,
  },
  outside: {
    backgroundColor: 'transparent',
  },
});
