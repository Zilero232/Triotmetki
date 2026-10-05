import { useEffect, useRef } from 'react';

import { gameface } from '@/shared/api/gameface';

import type { UseInputAreaInput } from './use-input-area.types';

import { inputAreaKey, inputAreaOf } from '../../../lib/input-area';

export const useInputArea = ({ edit, hover, dragging, screen, clickable, targets, hovered, report }: UseInputAreaInput): void => {
  const tracking = edit && hover;
  const grabbed = tracking ? targets.find((target) => target.id === hovered && (target.movable || target.pointer)) : undefined;
  const grabbedId = grabbed?.id ?? null;
  const area = inputAreaOf({ whole: edit && (!hover || dragging), screen, rects: grabbed ? [...clickable, grabbed.rect] : clickable });
  const areaRef = useRef(area);
  const key = inputAreaKey(area);

  areaRef.current = area;

  useEffect(() => {
    if (grabbedId !== null) {
      report('hover');
    }
  }, [grabbedId, report]);

  useEffect(() => {
    gameface.setInputArea(areaRef.current);
  }, [key]);
};
