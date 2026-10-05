import { clamp } from 'remeda';

import type { FigureBox, FigurePoint } from './figure.types';

const percent = (value: number): string => `${Math.round(clamp(value, { min: 0, max: 1 }) * 1000) / 10}%`;

export const percentBox = ({ x, y, w, h }: FigureBox) => ({ left: percent(x), top: percent(y), width: percent(w), height: percent(h) });

export const percentPoint = ({ x, y }: FigurePoint) => ({ left: percent(x), top: percent(y) });
