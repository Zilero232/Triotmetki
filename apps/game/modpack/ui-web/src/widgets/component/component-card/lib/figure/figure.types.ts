import type { UiFigure } from '@/shared/api/protocol';

export type FigureBox = UiFigure['shapes'][number];

export type FigurePoint = Pick<UiFigure['marks'][number], 'x' | 'y'>;
