import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, right }) => (
  <View style={styles.row}>
    <View style={styles.titles}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {right ? <View style={styles.right}>{right}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titles: {
    flexShrink: 1,
    gap: 2,
  },
  title: {
    ...type.tabTitle,
    color: colors.text.primary,
  },
  subtitle: {
    ...type.meta,
    color: colors.text.muted,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
