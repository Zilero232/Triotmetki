import type { LiveRect } from '@/entities/hud/panel-layout';

import { dragTo, pastSlop, placementOf } from '@/entities/hud/panel-layout';

import type { DragMotionInput, DragOutcome, OverlayDrag, PressDragInput } from './drag-motion.types';

import { EDIT_PANELS } from '../../config';

export const pressDrag = ({ target, press, scale }: PressDragInput): OverlayDrag => ({
  id: target.id,
  mouseX: press.clientX,
  mouseY: press.clientY,
  scale,
  rect: target.rect,
  moved: false,
  button: target.button
});

export const liveAt = ({ drag, press, screen }: DragMotionInput): LiveRect =>
  dragTo({ drag, pointer: { x: press.clientX, y: press.clientY }, screen, grid: EDIT_PANELS.grid }) ?? { id: drag.id, rect: drag.rect };

export const beyondSlop = ({ drag, press }: Omit<DragMotionInput, 'screen'>): boolean =>
  pastSlop({ from: { x: drag.mouseX, y: drag.mouseY }, to: { x: press.clientX, y: press.clientY }, slop: EDIT_PANELS.clickSlop });

export const dragOutcome = ({ drag, press, screen }: DragMotionInput): DragOutcome => {
  const moved = drag.moved || beyondSlop({ drag, press });

  if (!moved) {
    return drag.button ? { kind: 'pressed' } : { kind: 'still' };
  }

  return { kind: 'moved', placement: placementOf({ rect: liveAt({ drag, press, screen }).rect, screen }) };
};
