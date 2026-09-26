import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, tabularNums, type } from '../../theme';
import { DeltaText } from './DeltaText';
import { ChevronGlyph } from './glyphs';

interface ListRowProps {
  title: string;
  meta?: string;
  value?: string;
  delta?: number | null;
  deltaTone?: 'auto' | 'danger' | 'muted';
  onPress?: () => void;
  chevron?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  titleAccessory?: React.ReactNode;
  divider?: boolean;
  accessibilityLabel?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  meta,
  value,
  delta,
  deltaTone,
  onPress,
  chevron,
  left,
  right,
  titleAccessory,
  divider,
  accessibilityLabel,
}) => {
  const body = (
    <>
      {left}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {titleAccessory}
        </View>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
      {value != null ? <Text style={styles.value}>{value}</Text> : null}
      {delta !== undefined ? (
        <View style={styles.delta}>
          {delta == null ? null : <DeltaText value={delta} tone={deltaTone} />}
        </View>
      ) : null}
      {chevron ? <ChevronGlyph /> : null}
    </>
  );

  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.row}>{body}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...type.bodyStrong,
    color: colors.text.primary,
    flexShrink: 1,
  },
  meta: {
    ...type.metaSmall,
    color: colors.text.muted,
    ...tabularNums,
  },
  value: {
    ...type.value,
    color: colors.text.primary,
  },
  delta: {
    minWidth: 52,
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.divider,
  },
});
