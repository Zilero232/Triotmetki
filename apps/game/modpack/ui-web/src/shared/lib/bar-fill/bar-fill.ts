import { clamp } from 'remeda';

import type { BarFillInput } from './bar-fill.types';

export const barFill = ({ value, max, width }: BarFillInput): number => (max > 0 ? Math.round(clamp(value / max, { min: 0, max: 1 }) * width) : 0);
