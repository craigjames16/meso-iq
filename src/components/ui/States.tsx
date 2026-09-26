import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, type, size } from '../../theme';
import { Button } from './Button';
import { Card } from './Card';

export const ERROR_COPY = "Couldn't load this. Pull to try again.";
export const NOT_ENOUGH_COPY = 'Not enough sessions yet';

interface StateProps {
  message: string;
  action?: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' };
  compact?: boolean;
}

export const EmptyState: React.FC<StateProps> = ({ message, action, compact }) => (
  <Card style={compact ? styles.compact : undefined}>
    <Text style={styles.message}>{message}</Text>
    {action ? (
      <Button
        label={action.label}
        onPress={action.onPress}
        variant={action.variant ?? 'primary'}
        full
      />
    ) : null}
  </Card>
);

export const ErrorState: React.FC<Partial<StateProps> & { onRetry?: () => void }> = ({ message, onRetry }) => (
  <Card variant="danger">
    <Text style={styles.message}>{message ?? ERROR_COPY}</Text>
    {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" size="small" /> : null}
  </Card>
);

/** Inline placeholder for a metric that needs more history. */
export const NotEnough: React.FC<{ label?: string }> = ({ label = NOT_ENOUGH_COPY }) => (
  <Text style={styles.notEnough}>{label}</Text>
);

interface SkeletonProps {
  height: number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  rounded?: 'card' | 'tile' | 'field';
}

export const Skeleton: React.FC<SkeletonProps> = ({ height, width = '100%', style, rounded = 'card' }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[styles.skeleton, { height, width, borderRadius: radius[rounded], opacity }, style]}
    />
  );
};

export const SkeletonStack: React.FC<{ heights: number[] }> = ({ heights }) => (
  <View style={styles.stack}>
    {heights.map((h, i) => (
      <Skeleton key={i} height={h} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  compact: {
    paddingVertical: 12,
  },
  message: {
    ...type.body,
    fontSize: size.strong,
    color: colors.text.secondary,
  },
  notEnough: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  skeleton: {
    backgroundColor: colors.surface.inset,
  },
  stack: {
    gap: 14,
  },
});
