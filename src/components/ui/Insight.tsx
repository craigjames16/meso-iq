import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';

interface InsightProps {
  tone: 'warning' | 'success';
  icon: React.ReactNode;
  title: string;
  body: string;
}

/** A card with a coloured left rail, for "What changed". */
export const Insight: React.FC<InsightProps> = ({ tone, icon, title, body }) => (
  <View style={[styles.card, { borderLeftColor: tone === 'warning' ? colors.warning.base : colors.success.base }]}>
    <View style={styles.icon}>{icon}</View>
    <View style={styles.text}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 11,
    padding: 14,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.card,
    borderLeftWidth: 3,
    borderRadius: radius.tile,
  },
  icon: {
    paddingTop: 1,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...type.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  body: {
    ...type.meta,
    lineHeight: 18,
    color: colors.text.secondary,
  },
});
