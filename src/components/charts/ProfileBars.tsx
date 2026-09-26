import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, tabularNums, type, size } from '../../theme';

interface ProfileBarsProps {
  bars: { label: string; value: number; warn?: boolean }[];
  height?: number;
}

export const ProfileBars: React.FC<ProfileBarsProps> = ({ bars, height = 64 }) => {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel={bars.map((b) => `${b.label} ${b.value}`).join(', ')}>
      {bars.map((b) => (
        <View key={b.label} style={styles.col}>
          <Text style={[styles.value, b.warn && styles.warnText]}>{b.value}</Text>
          <View
            style={[
              styles.bar,
              {
                height: Math.max(3, (b.value / max) * height),
                backgroundColor: b.warn ? colors.warning.base : colors.data.main,
              },
            ]}
          />
          <Text style={styles.label}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  value: {
    ...type.tagSmall,
    fontWeight: '600',
    color: colors.text.secondary,
    ...tabularNums,
  },
  warnText: {
    color: colors.warning.base,
  },
  bar: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  label: {
    ...type.tagSmall,
    fontSize: size.micro,
    fontWeight: '400',
    letterSpacing: 0.3,
    color: colors.text.muted,
  },
});
