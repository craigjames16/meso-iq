import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';
import { Sheet } from './Sheet';
import { InfoGlyph } from './glyphs';
import { CHART_INFO, type ChartInfoId } from './chartInfo';

// Keeps the touch target at 44pt around the 22pt glyph.
const SLOP = { top: 11, bottom: 11, left: 11, right: 11 };

interface InfoButtonProps {
  /** Key into `CHART_INFO`. */
  id: ChartInfoId;
}

/** An info affordance for a chart. Opens a sheet explaining what the chart measures. */
export const InfoButton: React.FC<InfoButtonProps> = ({ id }) => {
  const [open, setOpen] = useState(false);
  const info = CHART_INFO[id];
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={SLOP}
        accessibilityRole="button"
        accessibilityLabel={`About ${info.title}`}
        accessibilityHint="Explains what this chart measures"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <InfoGlyph />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={info.title} subtitle={info.summary}>
        <View style={styles.list}>
          {info.details.map((d) => (
            <View key={d.term} style={styles.item}>
              <Text style={styles.term}>{d.term}</Text>
              <Text style={styles.text}>{d.text}</Text>
            </View>
          ))}
        </View>
        {info.note ? (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>NOTE</Text>
            <Text style={styles.text}>{info.note}</Text>
          </View>
        ) : null}
      </Sheet>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  list: {
    gap: 14,
  },
  item: {
    gap: 3,
  },
  term: {
    ...type.bodyStrong,
    color: colors.text.primary,
  },
  text: {
    ...type.meta,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  note: {
    gap: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.dividerAlt,
  },
  noteLabel: {
    ...type.label,
    color: colors.text.muted,
  },
});
