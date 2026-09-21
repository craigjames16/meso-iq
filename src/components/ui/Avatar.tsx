import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, type } from '../../theme';
import { IconButton } from './IconButton';

export const AvatarButton: React.FC<{ initial: string; onPress: () => void; size?: 34 }> = ({
  initial,
  onPress,
  size = 34,
}) => (
  <IconButton
    variant="round"
    size={size}
    onPress={onPress}
    accessibilityLabel="Account"
    icon={<Text style={styles.initial}>{initial.slice(0, 1).toUpperCase()}</Text>}
  />
);

const styles = StyleSheet.create({
  initial: {
    ...type.buttonSmall,
    color: colors.text.secondary,
  },
});
