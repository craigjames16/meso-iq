import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, hitSlop, type } from '../../theme';
import { InfoButton } from './InfoButton';
import type { ChartInfoId } from './chartInfo';

interface SectionLabelProps {
  children: string;
  action?: { label: string; onPress: () => void };
  right?: React.ReactNode;
  /** Adds an info button that explains the chart under this label. */
  info?: ChartInfoId;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, action, right, info }) => (
  <View style={styles.row}>
    <Text style={styles.label} accessibilityRole="header">
      {children}
    </Text>
    <View style={styles.rightGroup}>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={hitSlop} accessibilityRole="button">
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      ) : (
        right
      )}
      {info ? <InfoButton id={info} /> : null}
    </View>
  </View>
);

/** Card title with an optional right-side link or text, for "Recent · All workouts". */
export const CardTitle: React.FC<{
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  right?: React.ReactNode;
  /** Adds an info button that explains the chart under this title. */
  info?: ChartInfoId;
}> = ({ title, subtitle, action, right, info }) => (
  <View style={styles.titleRow}>
    <View style={styles.titleCol}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    <View style={styles.rightGroup}>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={hitSlop} accessibilityRole="button">
          <Text style={styles.link}>{action.label}</Text>
        </Pressable>
      ) : (
        right
      )}
      {info ? <InfoButton id={info} /> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...type.label,
    color: colors.text.muted,
  },
  action: {
    ...type.metaSmall,
    fontWeight: '600',
    color: colors.text.body,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleCol: {
    flexShrink: 1,
    gap: 3,
  },
  cardTitle: {
    ...type.cardTitle,
    color: colors.text.primary,
  },
  subtitle: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  link: {
    ...type.buttonSmall,
    color: colors.text.body,
  },
});
