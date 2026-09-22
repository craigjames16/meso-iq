import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, PlayGlyph, TrendGlyph } from '../ui';
import { colors, radius, shadow, type, size } from '../../theme';

export type TodayHeroProps =
  | {
      kind: 'workout' | 'inProgress';
      label: string;
      title: string;
      meta: string;
      chips?: string[];
      moreChips?: number;
      /** Rich carry-over line: plain and emphasised parts. */
      carryOver?: { text: string; strong?: boolean }[] | null;
      onPlay: () => void;
      busy?: boolean;
    }
  | { kind: 'rest'; label: string; onDone: () => void; busy?: boolean }
  | { kind: 'noCycle'; title?: string; meta?: string; onStartCycle: () => void }
  | { kind: 'newAccount'; onBuild: () => void };

export const TodayHero: React.FC<TodayHeroProps> = (props) => {
  if (props.kind === 'newAccount') {
    return (
      <Card variant="hero" gap={14}>
        <Text style={styles.label}>GET STARTED</Text>
        <Text style={styles.title}>Build your first program</Text>
        <Text style={styles.meta}>Set up your training days, then start a cycle to track it week by week.</Text>
        <Button label="Go to Plan" onPress={props.onBuild} full />
      </Card>
    );
  }
  if (props.kind === 'noCycle') {
    return (
      <Card variant="hero" gap={14}>
        <Text style={styles.label}>NO ACTIVE CYCLE</Text>
        <Text style={styles.title}>{props.title ?? 'No cycle running'}</Text>
        <Text style={styles.meta}>{props.meta ?? 'Start a cycle from one of your programs to get a plan for each day.'}</Text>
        <Button label="Start a cycle" onPress={props.onStartCycle} full />
      </Card>
    );
  }
  if (props.kind === 'rest') {
    return (
      <Card variant="hero" gap={14}>
        <Text style={styles.label}>{props.label}</Text>
        <Text style={styles.title}>Rest day</Text>
        <Text style={styles.meta}>Recover today. Mark it done to move on to the next training day.</Text>
        <Button label="Mark rest day done" onPress={props.onDone} loading={props.busy} full />
      </Card>
    );
  }

  const resume = props.kind === 'inProgress';
  return (
    <Card variant="hero" gap={14}>
      <View style={styles.top}>
        <View style={styles.titles}>
          <Text style={styles.label}>{props.label}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {props.title}
          </Text>
          <Text style={styles.meta}>{props.meta}</Text>
        </View>
        <Pressable
          onPress={props.onPlay}
          disabled={props.busy}
          accessibilityRole="button"
          accessibilityLabel={resume ? `Resume ${props.title}` : `Start ${props.title} workout`}
          style={({ pressed }) => [styles.play, pressed && styles.pressed]}
        >
          {props.busy ? <ActivityIndicator color={colors.action.onFill} /> : <PlayGlyph />}
        </Pressable>
      </View>
      {props.chips && props.chips.length > 0 ? (
        <View style={styles.chips}>
          {props.chips.map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {c}
              </Text>
            </View>
          ))}
          {props.moreChips ? (
            <View style={[styles.chip, styles.chipMore]}>
              <Text style={[styles.chipText, styles.chipMoreText]}>+{props.moreChips}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {props.carryOver && props.carryOver.length > 0 ? (
        <View style={styles.carry}>
          <TrendGlyph />
          <Text style={styles.carryText}>
            {props.carryOver.map((part, i) => (
              <Text key={i} style={part.strong ? styles.carryStrong : undefined}>
                {part.text}
              </Text>
            ))}
          </Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 5,
  },
  label: {
    ...type.label,
    fontSize: size.caption,
    color: colors.text.secondary,
  },
  title: {
    ...type.heroTitle,
    color: colors.text.primary,
  },
  meta: {
    ...type.meta,
    color: colors.text.muted,
  },
  play: {
    width: 58,
    height: 58,
    borderRadius: radius.play,
    backgroundColor: colors.action.fill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.badge,
    backgroundColor: colors.surface.field,
    maxWidth: '100%',
  },
  chipText: {
    ...type.metaSmall,
    color: colors.text.body,
  },
  chipMore: {
    backgroundColor: colors.surface.raised,
  },
  chipMoreText: {
    color: colors.text.faint,
  },
  carry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border.field,
  },
  carryText: {
    flex: 1,
    ...type.meta,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  carryStrong: {
    fontWeight: '600',
    color: colors.text.primary,
  },
});
