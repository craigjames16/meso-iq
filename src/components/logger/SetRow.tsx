import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, tabularNums, type, size } from '../../theme';
import { CheckGlyph, MoreGlyph } from '../ui/glyphs';
import type { AttachedSetType } from './types';

const TINT_MS = 180;

interface SetRowProps {
  label: string;
  weight: number;
  reps: number;
  completed: boolean;
  loading?: boolean;
  /** Technique of an attached row; undefined for main sets. */
  attachedType?: AttachedSetType;
  last: { weight: number; reps: number } | null;
  weightPlaceholder?: string;
  repsPlaceholder?: string;
  editable: boolean;
  onChangeWeight: (value: number) => void;
  onChangeReps: (value: number) => void;
  onToggle: () => void;
  onMenu: () => void;
}

function formatWeight(w: number): string {
  return w > 0 ? String(w) : '';
}

/** A numeric field that keeps its own text while focused, so "12." isn't cut to "12". */
const SetField: React.FC<{
  value: number;
  decimal: boolean;
  placeholder?: string;
  editable: boolean;
  completed: Animated.AnimatedInterpolation<string | number>;
  borderColor: Animated.AnimatedInterpolation<string | number>;
  textColor: string;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}> = ({ value, decimal, placeholder, editable, completed, borderColor, textColor, onChange, accessibilityLabel }) => {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(formatWeight(value));

  useEffect(() => {
    if (!focused) setText(formatWeight(value));
  }, [value, focused]);

  return (
    <Animated.View
      style={[
        styles.field,
        { backgroundColor: completed, borderColor },
        focused && styles.fieldFocused,
      ]}
    >
      <TextInput
        value={text}
        onChangeText={(t) => {
          const cleaned = decimal ? t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') : t.replace(/[^0-9]/g, '');
          setText(cleaned);
          const n = decimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        keyboardAppearance="dark"
        selectTextOnFocus
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        selectionColor={colors.action.fill}
        accessibilityLabel={accessibilityLabel}
        style={[styles.fieldInput, { color: textColor }]}
      />
    </Animated.View>
  );
};

export const SetRow: React.FC<SetRowProps> = ({
  label,
  weight,
  reps,
  completed,
  loading,
  attachedType,
  last,
  weightPlaceholder,
  repsPlaceholder,
  editable,
  onChangeWeight,
  onChangeReps,
  onToggle,
  onMenu,
}) => {
  const tint = useRef(new Animated.Value(completed ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(tint, { toValue: completed ? 1 : 0, duration: TINT_MS, useNativeDriver: false }).start();
  }, [completed, tint]);

  const technique = attachedType ? colors.technique[attachedType] : null;
  // Rows sit on a card, so the idle row and rail use the card colour.
  const idleRail = technique ? technique.fg : colors.surface.card;
  const doneRail = technique ? technique.fg : colors.success.base;

  const rowBg = tint.interpolate({ inputRange: [0, 1], outputRange: [colors.surface.card, colors.success.rowBg] });
  const rail = tint.interpolate({ inputRange: [0, 1], outputRange: [idleRail, doneRail] });
  const fieldBg = tint.interpolate({ inputRange: [0, 1], outputRange: [colors.surface.field, colors.success.fieldBg] });
  const fieldBorder = tint.interpolate({ inputRange: [0, 1], outputRange: [colors.border.field, colors.success.fieldBorder] });
  const badgeBg = tint.interpolate({
    inputRange: [0, 1],
    outputRange: [technique ? technique.tagBg : colors.surface.field, colors.success.badgeBg],
  });
  const badgeBorder = tint.interpolate({
    inputRange: [0, 1],
    outputRange: [technique ? technique.tagBg : colors.border.field, colors.success.fieldBorder],
  });

  const valueColor = completed ? colors.success.fieldText : colors.text.body;
  const badgeText = completed ? colors.success.badgeText : technique ? technique.fg : colors.text.secondary;

  return (
    <Animated.View
      style={[
        styles.row,
        attachedType && styles.attached,
        attachedType ? styles.railAttached : styles.railMain,
        { backgroundColor: rowBg, borderLeftColor: rail },
      ]}
    >
      <View style={styles.line}>
        <Animated.View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Text style={[styles.badgeText, { color: badgeText }]}>{label}</Text>
        </Animated.View>
        <SetField
          value={weight}
          decimal
          placeholder={weightPlaceholder}
          editable={editable && !completed}
          completed={fieldBg}
          borderColor={fieldBorder}
          textColor={valueColor}
          onChange={onChangeWeight}
          accessibilityLabel={`Set ${label} weight`}
        />
        <Text style={[styles.times, completed && styles.timesDone]}>×</Text>
        <SetField
          value={reps}
          decimal={false}
          placeholder={repsPlaceholder}
          editable={editable && !completed}
          completed={fieldBg}
          borderColor={fieldBorder}
          textColor={valueColor}
          onChange={onChangeReps}
          accessibilityLabel={`Set ${label} reps`}
        />
        <Pressable
          onPress={onToggle}
          disabled={!editable || loading}
          hitSlop={7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed, disabled: !editable || !!loading }}
          accessibilityLabel={completed ? `Unmark set ${label}` : `Mark set ${label} logged`}
          style={[styles.check, completed && styles.checkDone]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={completed ? colors.action.onFill : colors.text.secondary} />
          ) : completed ? (
            <CheckGlyph color={colors.action.onFill} />
          ) : null}
        </Pressable>
        <Pressable
          onPress={onMenu}
          disabled={!editable}
          hitSlop={{ top: 7, bottom: 7, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`Set ${label} options`}
          style={styles.menu}
        >
          <MoreGlyph color={colors.text.faint} />
        </Pressable>
      </View>
      {last ? (
        <View style={styles.lastLine}>
          <View style={styles.lastBadgeSpacer} />
          <Text style={[styles.last, completed && styles.lastDone]}>
            Last {formatWeight(last.weight) || '0'}
          </Text>
          <View style={styles.lastTimesSpacer} />
          <Text style={[styles.last, completed && styles.lastDone]}>Last {last.reps}</Text>
          <View style={styles.lastCheckSpacer} />
          <View style={styles.lastMenuSpacer} />
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    borderRadius: radius.field,
    paddingTop: 6,
    paddingBottom: 5,
    paddingHorizontal: 8,
  },
  attached: {
    marginLeft: 16,
  },
  railMain: {
    borderLeftWidth: 3,
  },
  railAttached: {
    borderLeftWidth: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 26,
    minHeight: 26,
    paddingHorizontal: 2,
    borderRadius: radius.badge,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...type.tag,
    ...tabularNums,
  },
  field: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.field,
    borderWidth: 1,
  },
  fieldFocused: {
    borderWidth: 1.5,
    borderColor: colors.action.fill,
  },
  fieldInput: {
    ...type.setField,
    textAlign: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  times: {
    width: 10,
    textAlign: 'center',
    fontSize: size.label,
    color: colors.text.disabled,
  },
  timesDone: {
    color: colors.success.lastText,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.success.base,
    borderColor: colors.success.base,
  },
  menu: {
    width: 20,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mirrors `line` so each hint sits centred under its own field.
  lastLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 3,
  },
  lastBadgeSpacer: {
    minWidth: 26,
  },
  lastTimesSpacer: {
    width: 10,
  },
  lastCheckSpacer: {
    width: 30,
  },
  lastMenuSpacer: {
    width: 20,
  },
  last: {
    ...type.caption,
    color: colors.text.faint,
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    ...tabularNums,
  },
  lastDone: {
    color: colors.success.lastText,
  },
});
