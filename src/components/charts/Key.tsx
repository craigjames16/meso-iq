import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { colors, radius, type } from '../../theme';

type KeyItem =
  | { kind: 'line'; label: string; color: string; dashed?: boolean }
  | { kind: 'ring'; label: string; color: string }
  | { kind: 'swatch'; label: string; color: string };

export const LineKey: React.FC<{ items: KeyItem[] }> = ({ items }) => (
  <View style={styles.row}>
    {items.map((item) => (
      <View key={item.label} style={styles.item}>
        <Svg width={16} height={10}>
          {item.kind === 'line' ? (
            <Line
              x1={1}
              y1={5}
              x2={15}
              y2={5}
              stroke={item.color}
              strokeWidth={2.4}
              strokeDasharray={item.dashed ? '4 3' : undefined}
              strokeLinecap="round"
            />
          ) : item.kind === 'ring' ? (
            <Circle cx={8} cy={5} r={4} fill="none" stroke={item.color} strokeWidth={2} />
          ) : (
            <Rect x={3} y={0} width={10} height={10} rx={radius.cell} fill={item.color} />
          )}
        </Svg>
        <Text style={styles.label}>{item.label}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.dividerAlt,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  label: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
});
