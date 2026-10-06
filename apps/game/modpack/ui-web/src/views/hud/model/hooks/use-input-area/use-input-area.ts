import { useInterval } from '@siberiacancode/reactuse';
import { useEffect, useRef } from 'react';

import { gameface } from '@/shared/api/gameface';
import { sendHud } from '@/shared/api/hud-protocol';

import type { UseInputAreaInput } from './use-input-area.types';

import { HUD_OVERLAY } from '../../../config';
import { inputAreaKey, inputAreaOf } from '../../../lib/input-area';

export const useInputArea = ({ edit, hover, dragging, screen, clickable, targets, hovered, report }: UseInputAreaInput): void => {
  const tracking = edit && hover;
  const grabbed = tracking ? targets.find((target) => target.id === hovered && (target.movable || target.pointer)) : undefined;
  const grabbedId = grabbed?.id ?? null;
  const isWhole = edit && (!hover || dragging);
  const area = inputAreaOf({ whole: isWhole, screen, rects: grabbed ? [...clickable, grabbed.rect] : clickable });
  const areaRef = useRef(area);
  const appliedRef = useRef<string | null>(null);
  const key = inputAreaKey(area);

  areaRef.current = area;

  const apply = (): void => {
    appliedRef.current = gameface.setInputArea(areaRef.current) ? inputAreaKey(areaRef.current) : null;
  };

  useEffect(() => {
    if (grabbedId !== null) {
      report('hover');
    }
  }, [grabbedId, report]);

  useEffect(() => {
    if (appliedRef.current !== key) {
      apply();
    }
  });

  useInterval(apply, HUD_OVERLAY.inputAreaRefreshMs);

  useEffect(() => {
    sendHud({ type: 'area', whole: isWhole });
  }, [isWhole]);
};
