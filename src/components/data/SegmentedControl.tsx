import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

export interface Segment {
  label: string;
  value: string;
}

export type DisplayMode = 'volume' | 'sets';

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  containerStyle?: ViewStyle;
  alignSelf?: boolean | 'auto' | 'center' | 'flex-start' | 'flex-end' | 'stretch' | 'baseline';
  segmentPadding?: number;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  value,
  onChange,
  containerStyle,
  alignSelf,
  segmentPadding,
}) => {
  if (segments.length === 0) return null;

  const containerAlignSelf = alignSelf === true ? 'center' : alignSelf;

  return (
    <View
      style={[
        styles.container,
        containerAlignSelf && { alignSelf: containerAlignSelf },
        containerStyle,
      ]}
    >
      {segments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;
        const isActive = value === segment.value;

        return (
          <TouchableOpacity
            key={segment.value}
            style={[
              styles.segment,
              segmentPadding !== undefined && {
                paddingHorizontal: segmentPadding,
              },
              isFirst && styles.firstSegment,
              isLast && styles.lastSegment,
              !isFirst && !isLast && styles.middleSegment,
              isActive && styles.activeSegment,
            ]}
            onPress={() => onChange(segment.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                isActive && styles.activeSegmentText,
              ]}
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstSegment: {
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
    borderRightWidth: 0,
  },
  lastSegment: {
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderLeftWidth: 0,
  },
  middleSegment: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  activeSegment: {
    backgroundColor: themeColors.overlay.light,
  },
  segmentText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeSegmentText: {
    fontWeight: '600',
  },
});

