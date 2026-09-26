import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { colors, size } from '../../theme';
import { useWidth } from './useWidth';

interface RadarProps {
  axes: string[];
  /** Normalised 0–1. */
  current: number[];
  previous?: number[] | null;
  height?: number;
  width?: number;
  accessibilityLabel?: string;
}

export const Radar: React.FC<RadarProps> = ({ axes, current, previous, height = 236, width: fixedWidth, accessibilityLabel }) => {
  const [width, onLayout] = useWidth(fixedWidth);
  const n = axes.length;
  const cx = width / 2;
  const cy = height / 2 - 6;
  const r = Math.min(width / 2 - 70, height / 2 - 26);
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v] as const;
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, Math.max(0, Math.min(1, v))).map((c) => c.toFixed(1)).join(',')).join(' ');
  const ring = (v: number) => axes.map((_, i) => pt(i, v).map((c) => c.toFixed(1)).join(',')).join(' ');

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {width > 0 && n >= 3 ? (
        <Svg width={width} height={height}>
          <Polygon points={ring(1)} stroke={colors.border.raised} strokeWidth={1} fill="none" />
          <Polygon points={ring(0.5)} stroke={colors.border.raised} strokeWidth={1} fill="none" />
          {axes.map((_, i) => {
            const [x, y] = pt(i, 1);
            return <Line key={`ax-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke={colors.border.dividerAlt} strokeWidth={1} />;
          })}
          {previous ? (
            <Polygon points={poly(previous)} stroke={colors.data.reference} strokeWidth={1.8} strokeDasharray="4 3" fill="none" />
          ) : null}
          <Polygon points={poly(current)} stroke={colors.data.main} strokeWidth={2} fill={colors.data.main} fillOpacity={0.18} />
          {current.map((v, i) => {
            const [x, y] = pt(i, Math.max(0, Math.min(1, v)));
            return <Circle key={`pt-${i}`} cx={x} cy={y} r={3.2} fill={colors.data.main} />;
          })}
          {axes.map((label, i) => {
            const [x, y] = pt(i, 1);
            const cos = Math.cos(angle(i));
            const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
            const dx = anchor === 'start' ? 8 : anchor === 'end' ? -8 : 0;
            const sin = Math.sin(angle(i));
            const dy = Math.abs(cos) < 0.2 ? (sin < 0 ? -8 : 16) : 4;
            return (
              <SvgText
                key={`lbl-${label}`}
                x={x + dx}
                y={y + dy}
                textAnchor={anchor}
                fill={colors.text.secondary}
                fontSize={size.caption}
                fontWeight="600"
                letterSpacing={0.5}
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
};
