import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, hitSlop, type } from '../../theme';
import { ChevronGlyph } from './glyphs';

interface DetailHeaderProps {
  title: string;
  meta?: string;
  onBack: () => void;
  backLabel?: string;
  action?: { label: string; onPress: () => void; disabled?: boolean };
  /** Rendered after the title, for example a status tag. */
  titleAccessory?: React.ReactNode;
  children?: React.ReactNode;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  title,
  meta,
  onBack,
  backLabel = 'Back',
  action,
  titleAccessory,
  children,
}) => (
  <View style={styles.wrap}>
    <View style={styles.nav}>
      <Pressable
        onPress={onBack}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        style={styles.back}
      >
        <ChevronGlyph direction="left" size={18} color={colors.text.body} strokeWidth={2} />
        <Text style={styles.backText}>{backLabel}</Text>
      </Pressable>
      {action ? (
        <Pressable
          onPress={action.onPress}
          disabled={action.disabled}
          hitSlop={hitSlop}
          accessibilityRole="button"
          style={styles.actionHit}
        >
          <Text style={[styles.action, action.disabled && styles.actionDisabled]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
    <View style={styles.titleRow}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {titleAccessory}
    </View>
    {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingRight: 8,
  },
  backText: {
    ...type.body,
    color: colors.text.body,
  },
  actionHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  action: {
    ...type.buttonSmall,
    fontSize: 14,
    color: colors.text.body,
  },
  actionDisabled: {
    color: colors.data.reference,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  title: {
    ...type.detailTitle,
    color: colors.text.primary,
    flexShrink: 1,
  },
  meta: {
    ...type.meta,
    color: colors.text.muted,
  },
});
