import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Measures a chart's container so charts can take their width from onLayout. */
export function useWidth(fixed?: number): [number, (e: LayoutChangeEvent) => void] {
  const [measured, setMeasured] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setMeasured((prev) => (prev === w ? prev : w));
  }, []);
  return [fixed ?? measured, onLayout];
}

/** Evenly spaced "nice" ticks covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const rawStep = (max - min) / Math.max(1, count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; ticks.length < count + 2; v += step) {
    ticks.push(Number(v.toFixed(6)));
    if (v >= max) break;
  }
  return ticks;
}
