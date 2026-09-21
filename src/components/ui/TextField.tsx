import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, type } from '../../theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Right-side text toggle, for example "Show" on a password field. */
  accessory?: { label: string; onPress: () => void };
  left?: React.ReactNode;
  multiline?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, hint, accessory, left, multiline, onFocus, onBlur, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.wrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View
          style={[
            styles.field,
            multiline && styles.multiline,
            focused && styles.focused,
            !!error && styles.errored,
          ]}
        >
          {left}
          <TextInput
            ref={ref}
            {...inputProps}
            multiline={multiline}
            accessibilityLabel={inputProps.accessibilityLabel ?? label}
            placeholderTextColor={colors.text.disabled}
            selectionColor={colors.action.fill}
            keyboardAppearance="dark"
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.input, multiline && styles.inputMultiline]}
          />
          {accessory ? (
            <Pressable onPress={accessory.onPress} accessibilityRole="button" hitSlop={10}>
              <Text style={styles.accessory}>{accessory.label}</Text>
            </Pressable>
          ) : null}
        </View>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  label: {
    ...type.label,
    fontSize: 10.5,
    color: colors.text.muted,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.field,
    borderRadius: radius.tile,
    paddingHorizontal: 15,
    minHeight: 46,
  },
  multiline: {
    alignItems: 'flex-start',
    paddingVertical: 13,
    minHeight: 96,
  },
  focused: {
    borderWidth: 1.5,
    borderColor: colors.action.fill,
  },
  errored: {
    borderColor: colors.danger.base,
  },
  input: {
    flex: 1,
    ...type.body,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: 13,
  },
  inputMultiline: {
    paddingVertical: 0,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  accessory: {
    ...type.buttonSmall,
    color: colors.text.secondary,
  },
  error: {
    ...type.metaSmall,
    color: colors.danger.base,
  },
  hint: {
    ...type.metaSmall,
    color: colors.text.faint,
  },
});
