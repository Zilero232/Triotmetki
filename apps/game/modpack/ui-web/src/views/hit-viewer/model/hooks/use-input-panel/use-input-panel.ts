import { useInterval } from '@siberiacancode/reactuse';
import { useRef } from 'react';

import { gameface } from '@/shared/api/gameface';

import { HIT_VIEWER } from '../../../config';

export const useInputPanel = <Element extends HTMLElement>() => {
  const panelRef = useRef<Element>(null);
  const lastKeyRef = useRef('');

  useInterval(() => {
    const rect = panelRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const area = { left: Math.floor(rect.left), top: Math.floor(rect.top), width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
    const key = `${area.left},${area.top},${area.width},${area.height}`;

    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      gameface.setInputArea(area);
    }
  }, HIT_VIEWER.inputCheckMs);

  return panelRef;
};
