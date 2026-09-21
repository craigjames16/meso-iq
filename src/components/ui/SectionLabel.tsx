import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, hitSlop, type } from '../../theme';

interface SectionLabelProps {
  children: string;
  action?: { label: string; onPress: () => void };
  right?: React.ReactNode;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, action, right }) => (
  <View style={styles.row}>
    <Text style={styles.label} accessibilityRole="header">
      {children}
    </Text>
    {action ? (
      <Pressable onPress={action.onPress} hitSlop={hitSlop} accessibilityRole="button">
        <Text style={styles.action}>{action.label}</Text>
      </Pressable>
    ) : (
      right
    )}
  </View>
);

/** Card title with an optional right-side link or text, for "Recent · All workouts". */
export const CardTitle: React.FC<{
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  right?: React.ReactNode;
}> = ({ title, subtitle, action, right }) => (
  <View style={styles.titleRow}>
    <View style={styles.titleCol}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {action ? (
      <Pressable onPress={action.onPress} hitSlop={hitSlop} accessibilityRole="button">
        <Text style={styles.link}>{action.label}</Text>
      </Pressable>
    ) : (
      right
    )}
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
