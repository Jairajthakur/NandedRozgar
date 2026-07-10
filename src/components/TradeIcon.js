/**
 * TradeIcon.js — hand-drawn, duotone trade-category icons.
 *
 * Ionicons' outline glyphs (construct-outline, flash-outline, etc.) read as
 * generic "system icon" style. This gives each labour category its own
 * illustrated icon — a filled main shape plus a lighter accent shape,
 * matching the polished, layered look used across service-marketplace apps.
 *
 * Usage: <TradeIcon name="Mason" size={26} color="#fff" />
 * `color` is applied at two opacities (1 and 0.55) to fake a duotone effect
 * with a single tint, so it always matches the surrounding tile color.
 */
import React from 'react';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';

const ICONS = {
  All: (c) => (
    <>
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col => (
          <Circle
            key={`${row}-${col}`}
            cx={13 + col * 11}
            cy={13 + row * 11}
            r={4}
            fill={c}
            opacity={(row + col) % 2 === 0 ? 1 : 0.55}
          />
        ))
      )}
    </>
  ),
  Mason: (c) => (
    <>
      <Rect x={19} y={4} width={10} height={15} rx={4} fill={c} opacity={0.55} />
      <Polygon points="13,17 35,17 30,34 18,34" fill={c} />
      <Rect x={9} y={38} width={11} height={6} rx={1.5} fill={c} opacity={0.55} />
      <Rect x={22} y={38} width={17} height={6} rx={1.5} fill={c} opacity={0.55} />
    </>
  ),
  Electrician: (c) => (
    <>
      <Circle cx={35} cy={11} r={5} fill={c} opacity={0.55} />
      <Path d="M27 3 L14 26 L22 26 L18 45 L36 20 L26 20 Z" fill={c} />
    </>
  ),
  Plumber: (c) => (
    <>
      <Path
        d="M9 12a7 7 0 0 1 14 0v4h4v6h-4v4a7 7 0 0 1-14 0z"
        fill={c}
        opacity={0.55}
      />
      <Path d="M27 6c6 6 9 11 9 16a9 9 0 1 1-18 0c0-5 3-10 9-16z" fill={c} />
      <Circle cx={27} cy={24} r={4} fill={c} opacity={0.55} />
    </>
  ),
  Painter: (c) => (
    <>
      <Rect x={8} y={8} width={22} height={11} rx={3} fill={c} opacity={0.55} />
      <Rect x={16} y={19} width={6} height={9} fill={c} opacity={0.55} />
      <Path d="M19 27c5 0 9 4 9 8a5 5 0 0 1-10 0c0-3 1-5 1-8z" fill={c} />
      <Circle cx={35} cy={13} r={2.4} fill={c} />
      <Circle cx={39} cy={20} r={1.8} fill={c} opacity={0.7} />
    </>
  ),
  Carpenter: (c) => (
    <>
      <Rect x={5} y={30} width={30} height={6} rx={2} fill={c} opacity={0.55} />
      <Rect x={17} y={4} width={7} height={22} rx={2} transform="rotate(18 20 15)" fill={c} />
      <Circle cx={30} cy={11} r={4.5} fill={c} />
    </>
  ),
  Welder: (c) => (
    <>
      <Path d="M8 14c0-6 6-10 14-10s14 4 14 10v9c0 3-3 6-14 6S8 26 8 23z" fill={c} opacity={0.55} />
      <Rect x={14} y={16} width={20} height={4} rx={2} fill={c} />
      <Path d="M35 6l3 5-6 1z" fill={c} />
      <Path d="M39 12l4 3-5 2z" fill={c} opacity={0.7} />
      <Path d="M33 15l3 5-6-1z" fill={c} opacity={0.7} />
    </>
  ),
  Helper: (c) => (
    <>
      <Circle cx={16} cy={12} r={6} fill={c} opacity={0.55} />
      <Path d="M4 34c0-8 5-13 12-13s12 5 12 13z" fill={c} opacity={0.55} />
      <Circle cx={32} cy={15} r={5.5} fill={c} />
      <Path d="M20 40c0-7.5 5-12.5 12-12.5S44 32.5 44 40z" fill={c} />
    </>
  ),
  Other: (c) => (
    <>
      <Rect x={7} y={17} width={34} height={22} rx={4} fill={c} opacity={0.55} />
      <Path d="M17 17v-4a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v4" fill="none" stroke={c} strokeWidth={4} />
      <Rect x={7} y={24} width={34} height={6} fill={c} />
    </>
  ),
};

export default function TradeIcon({ name, size = 26, color = '#fff' }) {
  const draw = ICONS[name] || ICONS.Other;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {draw(color)}
    </Svg>
  );
}
