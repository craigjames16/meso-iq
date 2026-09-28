import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { glass } from '../../theme';

interface GlassRimProps {
  width: number;
  height: number;
  /** Defaults to a capsule. Pass half the size for a circle, or a corner radius. */
  radius?: number;
}

/**
 * The 1px gradient edge that makes a surface read as a pane of glass rather than
 * a flat panel. It is brightest at the top, where light would strike it.
 */
export const GlassRim: React.FC<GlassRimProps> = ({ width, height, radius }) => {
  // Each rim owns its gradient, so two of them on one screen can't collide.
  const id = `rim${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          {glass.rimStops.map(stop => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={radius ?? (height - 1) / 2}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={1}
      />
    </Svg>
  );
};
