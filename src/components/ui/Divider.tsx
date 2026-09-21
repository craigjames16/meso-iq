import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

export const Divider: React.FC<{ inset?: number }> = ({ inset = 0 }) => (
  <View style={[styles.line, inset ? { marginLeft: inset } : null]} />
);

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: colors.border.divider,
  },
});
