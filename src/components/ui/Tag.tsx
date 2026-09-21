import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';

export type TagTone = 'neutral' | 'success' | 'warning' | 'danger' | 'drop' | 'restPause' | 'myo' | 'data';

interface TagProps {
  label: string;
  tone?: TagTone;
  size?: 'default' | 'small';
}

const toneStyles: Record<TagTone, { bg: string; fg: string; border?: string }> = {
  neutral: { bg: colors.surface.field, fg: colors.text.secondary },
  success: { bg: colors.success.pillBg, fg: colors.success.pillText, border: colors.success.pillBorder },
  warning: { bg: colors.warning.bg, fg: colors.warning.base, border: colors.warning.border },
  danger: { bg: colors.danger.bg, fg: colors.danger.base, border: colors.danger.border },
  drop: { bg: colors.technique.DROP_SET.tagBg, fg: colors.technique.DROP_SET.fg },
  restPause: { bg: colors.technique.REST_PAUSE.tagBg, fg: colors.technique.REST_PAUSE.fg },
  myo: { bg: colors.technique.MYO_REP.tagBg, fg: colors.technique.MYO_REP.fg },
  data: { bg: colors.surface.field, fg: colors.data.main },
};

export const Tag: React.FC<TagProps> = ({ label, tone = 'neutral', size = 'default' }) => {
  const t = toneStyles[tone];
  return (
    <View
      style={[
        styles.base,
        size === 'small' && styles.small,
        { backgroundColor: t.bg, borderColor: t.border ?? t.bg },
      ]}
    >
      <Text style={[size === 'small' ? type.tagSmall : type.tag, styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.tag,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  text: {
    letterSpacing: 0.5,
  },
});
