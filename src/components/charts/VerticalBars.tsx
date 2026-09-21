import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, radius } from '../../theme';
import { niceTicks, useWidth } from './useWidth';

export interface VerticalBar {
  label: string;
  value: number;
  partial?: boolean;
  /** Draws the bar in the main data colour, for example the latest full month. */
  highlight?: boolean;
  /** Only every few bars need an axis label. */
  showLabel?: boolean;
}

interface VerticalBarsProps {
  bars: VerticalBar[];
  /** One value per bar; null leaves a gap. Drawn as a white dashed line. */
  average?: (number | null)[];
  height?: number;
  width?: number;
  formatY?: (v: number) => string;
  accessibilityLabel?: string;
}

const PAD_LEFT = 30;
const PAD_RIGHT = 4;
const PAD_TOP = 10;
const PAD_BOTTOM = 34;

export const VerticalBars: React.FC<VerticalBarsProps> = ({
  bars,
  average,
  height = 176,
  width: fixedWidth,
  formatY = (v) => String(v),
  accessibilityLabel,
}) => {
  const [width, onLayout] = useWidth(fixedWidth);
  const max = Math.max(1, ...bars.map((b) => b.value), ...(average ?? []).map((v) => v ?? 0));
  const ticks = niceTicks(0, max, 3);
  const top = ticks[ticks.length - 1] || max;
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const slot = bars.length > 0 ? plotW / bars.length : 0;
  const barW = Math.max(4, Math.min(22, slot * 0.7));
  const sy = (v: number) => PAD_TOP + (1 - v / top) * plotH;
  const cx = (i: number) => PAD_LEFT + slot * i + slot / 2;

  const avgSegments: string[][] = [];
  (average ?? []).forEach((v, i) => {
    if (v == null) {
      avgSegments.push([]);
      return;
    }
    if (avgSegments.length === 0) avgSegments.push([]);
    avgSegments[avgSegments.length - 1].push(`${cx(i).toFixed(1)},${sy(v).toFixed(1)}`);
  });

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((t, i) => (
            <React.Fragment key={t}>
              <Line
                x1={PAD_LEFT - 8}
                x2={width - PAD_RIGHT}
                y1={sy(t)}
                y2={sy(t)}
                stroke={i === 0 ? colors.border.dividerAlt : colors.surface.inset}
                strokeWidth={1}
              />
              <SvgText x={PAD_LEFT - 12} y={sy(t) + 3} textAnchor="end" fill={colors.text.faint} fontSize={9}>
                {formatY(t)}
              </SvgText>
            </React.Fragment>
          ))}
          {bars.map((b, i) => {
            const h = Math.max(0, (b.value / top) * plotH);
            const x = cx(i) - barW / 2;
            return (
              <React.Fragment key={`${b.label}-${i}`}>
                {b.partial ? (
                  <Rect
                    x={x}
                    y={sy(b.value)}
                    width={barW}
                    height={h}
                    rx={radius.cell}
                    fill={colors.data.main}
                    fillOpacity={0.14}
                    stroke={colors.data.secondary}
                    strokeWidth={1}
                    strokeDasharray="3 2"
                  />
                ) : (
                  <Rect
                    x={x}
                    y={sy(b.value)}
                    width={barW}
                    height={h}
                    rx={radius.cell}
                    fill={b.highlight ? colors.data.main : colors.data.secondary}
                  />
                )}
                {b.showLabel !== false ? (
                  <SvgText x={cx(i)} y={height - 20} textAnchor="middle" fill={colors.text.faint} fontSize={9.5}>
                    {b.label}
                  </SvgText>
                ) : null}
                {b.partial ? (
                  <SvgText x={cx(i)} y={height - 6} textAnchor="middle" fill={colors.text.faint} fontSize={8.5}>
                    so far
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}
          {avgSegments
            .filter((seg) => seg.length > 1)
            .map((seg, i) => (
              <Polyline
                key={`avg-${i}`}
                points={seg.join(' ')}
                stroke={colors.data.average}
                strokeWidth={2}
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
};
