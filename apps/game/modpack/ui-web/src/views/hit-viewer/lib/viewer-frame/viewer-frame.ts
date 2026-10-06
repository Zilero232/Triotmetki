import { clamp } from 'remeda';

import type { ClientSize } from '@/shared/api/gameface';

import { rem } from '@/shared/lib/css-unit';

import type { ViewerFrame, ViewerFrameInput } from './viewer-frame.types';

import { HIT_VIEWER } from '../../config';

const fitScale = ({ width, height }: ClientSize): number => {
  const { design, minScale, maxScale } = HIT_VIEWER.frame;
  const fit = Math.min(width / design.width, height / design.height);

  return Number.isFinite(fit) && fit > 0 ? clamp(fit, { min: minScale, max: maxScale }) : minScale;
};

export const viewerFrame = ({ screen, view }: ViewerFrameInput): ViewerFrame => {
  const place = view ?? { x: 0, y: 0, ...screen };
  const left = Math.max(0, -place.x);
  const top = Math.max(0, -place.y);
  const right = Math.min(place.width, screen.width - place.x);
  const bottom = Math.min(place.height, screen.height - place.y) - HIT_VIEWER.frame.lobbyBar;
  const width = Math.max(right - left, 0);
  const height = Math.max(bottom - top, 0);
  const scale = fitScale({ width, height });

  return { left, top, width: width / scale, height: height / scale, scale };
};

export const tableBodyHeight = (rows: number): string => rem(rows * HIT_VIEWER.table.rowHeight);

export const pickerListHeight = (rows: number): string => rem(Math.min(rows, HIT_VIEWER.picker.maxRows) * HIT_VIEWER.picker.rowHeight);
