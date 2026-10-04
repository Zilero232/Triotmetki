import type { SparklineInput, SparklinePoint, SparklineView } from './hud-sparkline.types';

const round = (value: number): number => Math.round(value * 10) / 10;

export const sparkline = ({ points, width, height, inset }: SparklineInput): SparklineView => {
  if (points.length < 2) {
    return { path: '', last: null };
  }

  const low = Math.min(...points);
  const range = Math.max(...points) - low || 1;
  const step = (width - inset * 2) / (points.length - 1);
  const coords: SparklinePoint[] = points.map((value, index) => ({
    x: round(inset + index * step),
    y: round(inset + (1 - (value - low) / range) * (height - inset * 2))
  }));

  return {
    path: coords.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${String(x)} ${String(y)}`).join(' '),
    last: coords[coords.length - 1] ?? null
  };
};
