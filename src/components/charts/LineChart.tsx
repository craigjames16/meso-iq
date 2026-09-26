import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { colors, size } from '../../theme';
import { niceTicks, useWidth } from './useWidth';

export interface LinePoint {
  x: Date;
  y: number;
  isPR?: boolean;
}

interface LineChartProps {
  points: LinePoint[];
  /** Slope and intercept in y per millisecond from the first point's x. */
  trend?: { slope: number; intercept: number } | null;
  yTicks?: number[];
  xLabels?: { x: Date; label: string }[];
  height?: number;
  width?: number;
  formatY?: (v: number) => string;
  accessibilityLabel?: string;
}

const PAD_LEFT = 34;
const PAD_RIGHT = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;

export const LineChart: React.FC<LineChartProps> = ({
  points,
  trend,
  yTicks,
  xLabels,
  height = 180,
  width: fixedWidth,
  formatY = (v) => String(Math.round(v)),
  accessibilityLabel,
}) => {
  const [width, onLayout] = useWidth(fixedWidth);

  const geo = useMemo(() => {
    if (points.length === 0 || width === 0) return null;
    const xs = points.map((p) => p.x.getTime());
    const ys = points.map((p) => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const ticks = yTicks ?? niceTicks(Math.min(...ys), Math.max(...ys), 4);
    const yMin = Math.min(ticks[0], ...ys);
    const yMax = Math.max(ticks[ticks.length - 1], ...ys);
    const plotW = width - PAD_LEFT - PAD_RIGHT;
    const plotH = height - PAD_TOP - PAD_BOTTOM;
    const sx = (t: number) => PAD_LEFT + (x1 === x0 ? plotW / 2 : ((t - x0) / (x1 - x0)) * plotW);
    const sy = (v: number) => PAD_TOP + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;
    return { x0, x1, ticks, sx, sy, plotW };
  }, [points, width, height, yTicks]);

  return (
    <View onLayout={onLayout} accessible accessibilityLabel={accessibilityLabel} accessibilityRole="image">
      {geo ? (
        <Svg width={width} height={height}>
          {geo.ticks.map((t, i) => (
            <React.Fragment key={t}>
              <Line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={geo.sy(t)}
                y2={geo.sy(t)}
                stroke={i === 0 ? colors.border.dividerAlt : colors.border.divider}
                strokeWidth={1}
              />
              <SvgText x={PAD_LEFT - 6} y={geo.sy(t) + 3} textAnchor="end" fill={colors.text.faint} fontSize={size.tagSmall}>
                {formatY(t)}
              </SvgText>
            </React.Fragment>
          ))}
          {trend ? (
            <Line
              x1={geo.sx(geo.x0)}
              y1={geo.sy(trend.intercept)}
              x2={geo.sx(geo.x1)}
              y2={geo.sy(trend.intercept + trend.slope * (geo.x1 - geo.x0))}
              stroke={colors.data.reference}
              strokeWidth={1.6}
              strokeDasharray="5 4"
            />
          ) : null}
          {points.length > 1 ? (
            <Polyline
              points={points.map((p) => `${geo.sx(p.x.getTime()).toFixed(1)},${geo.sy(p.y).toFixed(1)}`).join(' ')}
              stroke={colors.data.main}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : (
            <Circle cx={geo.sx(points[0].x.getTime())} cy={geo.sy(points[0].y)} r={3} fill={colors.data.main} />
          )}
          {points
            .filter((p) => p.isPR)
            .map((p) => (
              <Circle
                key={`pr-${p.x.getTime()}`}
                cx={geo.sx(p.x.getTime())}
                cy={geo.sy(p.y)}
                r={4.5}
                fill={colors.bg}
                stroke={colors.data.main}
                strokeWidth={2}
              />
            ))}
          {(xLabels ?? []).map((l, i, arr) => {
            const x = geo.sx(l.x.getTime());
            const anchor = i === 0 && arr.length > 1 ? 'start' : i === arr.length - 1 && arr.length > 1 ? 'end' : 'middle';
            return (
              <SvgText key={`${l.label}-${i}`} x={x} y={height - 8} textAnchor={anchor} fill={colors.text.faint} fontSize={size.tagSmall}>
                {l.label}
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

/** Two-item key for charts whose markers aren't labelled. */
export { LineKey } from './Key';
