import { useWindowEvent } from '@siberiacancode/reactuse';
import { useRef, useState } from 'react';

import type { Drag, LiveRect } from '@/entities/hud/panel-layout';
import type { UiMessageOf } from '@/shared/api/protocol';

import { dragTo, moveMessage, pastSlop } from '@/entities/hud/panel-layout';
import { send } from '@/shared/api/protocol';

import type { StageDrag, UseStageDragInput } from './use-stage-drag.types';

import { HUD_EDITOR } from '../../../config';

export const useStageDrag = ({ screenRef }: UseStageDragInput) => {
  const dragRef = useRef<StageDrag | null>(null);
  const [live, setLive] = useState<LiveRect | null>(null);

  const liveAt = (event: MouseEvent): LiveRect | null => {
    const drag = dragRef.current;

    if (!drag) {
      return null;
    }

    drag.moved =
      drag.moved || pastSlop({ from: { x: drag.mouseX, y: drag.mouseY }, to: { x: event.clientX, y: event.clientY }, slop: HUD_EDITOR.dragSlop });

    return drag.moved ? dragTo({ drag, pointer: { x: event.clientX, y: event.clientY }, screen: screenRef.current, grid: HUD_EDITOR.grid }) : null;
  };

  const follow = (event: MouseEvent): void => {
    const moved = liveAt(event);

    if (moved) {
      setLive(moved);
    }
  };

  const drop = (event: MouseEvent): void => {
    const moved = liveAt(event);

    dragRef.current = null;
    setLive(null);

    if (moved) {
      send(moveMessage({ ...moved, screen: screenRef.current }));
    }
  };

  useWindowEvent('mousemove', follow);
  useWindowEvent('mouseup', drop);

  return {
    live,
    moveNow: (message: UiMessageOf<'hud_move'>) => send(message),
    startDrag: (drag: Drag) => {
      dragRef.current = { ...drag, moved: false };
    }
  };
};
