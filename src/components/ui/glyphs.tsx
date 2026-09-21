import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '../../theme';

interface GlyphProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const PlayGlyph: React.FC<GlyphProps> = ({ size = 22, color = colors.action.onFill }) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Path d="M7.5 4.6 17 11l-9.5 6.4V4.6Z" fill={color} />
  </Svg>
);

export const CheckGlyph: React.FC<GlyphProps> = ({ size = 16, color = colors.action.onFill, strokeWidth = 2.2 }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M3.5 8.3 6.6 11.4 12.6 4.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckCircleGlyph: React.FC<GlyphProps & { fill?: string }> = ({ size = 20, color = colors.action.onFill, fill = colors.action.fill }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={9} fill={fill} />
    <Path d="M6 10.2 8.7 12.9 14 7.4" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronGlyph: React.FC<GlyphProps & { direction?: 'left' | 'right' | 'down' | 'up' }> = ({
  size = 14,
  color = colors.text.faint,
  strokeWidth = 1.8,
  direction = 'right',
}) => {
  const d = {
    right: 'M6 3.5 10.5 8 6 12.5',
    left: 'M10 3.5 5.5 8 10 12.5',
    down: 'M3.5 6 8 10.5 12.5 6',
    up: 'M3.5 10 8 5.5 12.5 10',
  }[direction];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

export const CloseGlyph: React.FC<GlyphProps> = ({ size = 14, color = colors.text.secondary, strokeWidth = 1.7 }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M4 4l8 8M12 4l-8 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const PlusGlyph: React.FC<GlyphProps> = ({ size = 15, color = colors.text.secondary, strokeWidth = 1.7 }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M8 3.2v9.6M3.2 8h9.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const MoreGlyph: React.FC<GlyphProps> = ({ size = 16, color = colors.text.faint }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={3.5} r={1.4} fill={color} />
    <Circle cx={8} cy={8} r={1.4} fill={color} />
    <Circle cx={8} cy={12.5} r={1.4} fill={color} />
  </Svg>
);

export const FlameGlyph: React.FC<GlyphProps> = ({ size = 11, color = colors.success.pillText }) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <Path
      d="M6 1.2c.9 2 2.9 2.7 2.9 5A2.9 2.9 0 0 1 6 10.8 2.9 2.9 0 0 1 3.1 6.2c0-1.2.6-1.9 1.2-2.6.3.6.7 1 1.1 1.2C5.2 3.6 5.4 2.3 6 1.2Z"
      stroke={color}
      strokeWidth={1.1}
      strokeLinejoin="round"
    />
  </Svg>
);

export const TrendGlyph: React.FC<GlyphProps> = ({ size = 15, color = colors.text.body }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M2.5 11.5 6 8l2.4 2.4L13.5 5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.2 5h3.3v3.3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const WarningGlyph: React.FC<GlyphProps> = ({ size = 16, color = colors.warning.base }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M8 2.2 14.2 13H1.8L8 2.2Z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    <Path d="M8 6.4v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Circle cx={8} cy={11.2} r={0.8} fill={color} />
  </Svg>
);

export const ReorderGlyph: React.FC<GlyphProps> = ({ size = 14, color = colors.text.disabled }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Circle cx={5} cy={3} r={1.1} fill={color} />
    <Circle cx={9} cy={3} r={1.1} fill={color} />
    <Circle cx={5} cy={7} r={1.1} fill={color} />
    <Circle cx={9} cy={7} r={1.1} fill={color} />
    <Circle cx={5} cy={11} r={1.1} fill={color} />
    <Circle cx={9} cy={11} r={1.1} fill={color} />
  </Svg>
);

export const SearchGlyph: React.FC<GlyphProps> = ({ size = 15, color = colors.text.faint }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Circle cx={7} cy={7} r={4.6} stroke={color} strokeWidth={1.5} />
    <Path d="M10.5 10.5 14 14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

export const TrackTabGlyph: React.FC<GlyphProps> = ({ size = 21, color = colors.text.secondary }) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Path d="M3 8.5v5M19 8.5v5M6 6.5v9M16 6.5v9M6 11h10" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
  </Svg>
);

export const DataTabGlyph: React.FC<GlyphProps> = ({ size = 21, color = colors.text.secondary }) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Path d="M4 18V11M11 18V4M18 18v-5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

export const PlanTabGlyph: React.FC<GlyphProps> = ({ size = 21, color = colors.text.secondary }) => (
  <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <Rect x={3.5} y={4.5} width={15} height={14} rx={2.5} stroke={color} strokeWidth={1.8} />
    <Path d="M3.5 9h15M7.5 3v3M14.5 3v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
