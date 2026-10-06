import { clamp } from 'remeda';

import type { ViewerFrame, ViewerFrameInput } from './viewer-frame.types';

import { HIT_VIEWER } from '../../config';

export const viewerFrame = ({ screen }: ViewerFrameInput): ViewerFrame => {
  const { design, minScale, maxScale } = HIT_VIEWER.frame;
  const fit = Math.min(screen.width / design.width, screen.height / design.height);
  const scale = Number.isFinite(fit) && fit > 0 ? clamp(fit, { min: minScale, max: maxScale }) : minScale;

  return { scale, width: screen.width / scale, height: screen.height / scale };
};

export const tableBodyHeight = (rows: number): string => `${String(rows * HIT_VIEWER.table.rowHeight)}rem`;
