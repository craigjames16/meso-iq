import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

export type DisplayMode = 'volume' | 'sets';

interface VolumeSetsToggleProps {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

export const VolumeSetsToggle: React.FC<VolumeSetsToggleProps> = ({ value, onChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.leftButton,
          value === 'volume' && styles.activeButton,
        ]}
        onPress={() => onChange('volume')}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, value === 'volume' && styles.activeButtonText]}>
          Volume
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.button,
          styles.rightButton,
          value === 'sets' && styles.activeButton,
        ]}
        onPress={() => onChange('sets')}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, value === 'sets' && styles.activeButtonText]}>
          Sets
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  button: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  leftButton: {
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
    borderRightWidth: 0,
  },
  rightButton: {
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderLeftWidth: 0,
  },
  activeButton: {
    backgroundColor: themeColors.overlay.medium,
  },
  buttonText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeButtonText: {
    color: themeColors.primary.main,
    fontWeight: '600',
  },
});

