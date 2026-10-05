import { useDocumentEvent, useWindowEvent } from '@siberiacancode/reactuse';
import { useRef } from 'react';

import type { PageMouseHandlers, PickHandler } from './use-page-mouse.types';

import { FRAME_GESTURE } from '../../../config';

export const usePageMouse = (handlers: PageMouseHandlers): void => {
  const lastRef = useRef<Event | null>(null);

  const once =
    (pick: PickHandler) =>
    (event: MouseEvent): void => {
      if (lastRef.current === event) {
        return;
      }

      lastRef.current = event;
      pick(handlers)(event);
    };

  const press = once(({ onPress }) => onPress);
  const follow = once(({ onMove }) => onMove);
  const finish = once(({ onRelease }) => onRelease);

  useDocumentEvent('mousedown', press, FRAME_GESTURE.capture);
  useDocumentEvent('mousemove', follow, FRAME_GESTURE.capture);
  useDocumentEvent('mouseup', finish, FRAME_GESTURE.capture);
  useWindowEvent('mousedown', press);
  useWindowEvent('mousemove', follow);
  useWindowEvent('mouseup', finish);
};
