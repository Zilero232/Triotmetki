import { useWindowEvent } from '@siberiacancode/reactuse';
import { useEffect, useRef, useState } from 'react';

import type { LiveRect } from '@/entities/hud/panel-layout';

import { readScreen, screenScale, targetAt } from '@/entities/hud/panel-layout';
import { sendHud } from '@/shared/api/hud-protocol';

import type { OverlayDrag, PanelPress } from '../../../lib/drag-motion';
import type { SettleDragInput, UsePanelDragInput } from './use-panel-drag.types';

import { beyondSlop, dragOutcome, liveAt, pressDrag } from '../../../lib/drag-motion';

const settleDrag = ({ drag, press, onMoved }: SettleDragInput): void => {
  const outcome = dragOutcome({ drag, press, screen: readScreen() });

  if (outcome.kind === 'pressed') {
    sendHud({ type: 'pressed', id: drag.id });
  } else if (outcome.kind === 'moved') {
    onMoved({ id: drag.id, placement: outcome.placement });
    sendHud({ type: 'moved', id: drag.id, ...outcome.placement });
  }
};

export const usePanelDrag = ({ edit, targets, onMoved, report }: UsePanelDragInput) => {
  const [live, setLive] = useState<LiveRect | null>(null);
  const dragRef = useRef<OverlayDrag | null>(null);
  const lastRef = useRef<PanelPress | null>(null);

  const finish = (press: PanelPress): void => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    dragRef.current = null;
    lastRef.current = null;
    setLive(null);
    settleDrag({ drag, press, onMoved });
  };

  const press = (event: MouseEvent): void => {
    const target = edit ? targetAt({ targets: targets(), press: event, scale: screenScale() }) : null;

    if (!target || event.button > 0) {
      return;
    }

    event.preventDefault();
    report('down');

    dragRef.current = pressDrag({ target, press: event, scale: screenScale() });
    setLive({ id: target.id, rect: target.rect });
  };

  const follow = (event: MouseEvent): void => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    drag.moved = drag.moved || beyondSlop({ drag, press: event });
    lastRef.current = { clientX: event.clientX, clientY: event.clientY };

    if (drag.moved) {
      setLive(liveAt({ drag, press: event, screen: readScreen() }));
    }
  };

  const blockImageDrag = (event: DragEvent): void => {
    if (edit) {
      event.preventDefault();
    }
  };

  const finishRef = useRef(finish);

  finishRef.current = finish;

  useWindowEvent('mousedown', press);
  useWindowEvent('mousemove', follow);
  useWindowEvent('mouseup', finish);
  useWindowEvent('dragstart', blockImageDrag);

  useEffect(() => {
    const drag = dragRef.current;

    if (!edit && drag) {
      finishRef.current(lastRef.current ?? { clientX: drag.mouseX, clientY: drag.mouseY });
    }
  }, [edit]);

  return { live };
};
