import React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../../theme';

interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({ values, color = colors.data.main, width = 56, height = 22 }) => {
  const pad = 2;
  if (values.length === 0) return <Svg width={width} height={height} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const step = (width - pad * 2) / (pts.length - 1);
  const points = pts
    .map((v, i) => {
      const x = pad + i * step;
      const y = max === min ? height / 2 : pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polyline points={points} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
};
