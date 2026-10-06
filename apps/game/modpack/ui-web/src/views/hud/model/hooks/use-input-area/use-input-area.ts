import { useInterval } from '@siberiacancode/reactuse';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { gameface } from '@/shared/api/gameface';
import { sendHud } from '@/shared/api/hud-protocol';

import type { UseInputAreaInput } from './use-input-area.types';

import { HUD_OVERLAY } from '../../../config';
import { grabbedTarget, inputAreaKey, inputAreaOf } from '../../../lib/input-area';

export const useInputArea = ({ edit, hover, dragging, screen, clickable, targets, hovered, report }: UseInputAreaInput): void => {
  const [isRefused, setIsRefused] = useState(false);
  const grabbed = grabbedTarget({ tracking: edit && hover, targets, hovered });
  const grabbedId = grabbed?.id ?? null;
  const isWhole = edit && (!hover || dragging);
  const area = inputAreaOf({ whole: isWhole, screen, rects: grabbed ? [...clickable, grabbed.rect] : clickable });
  const areaRef = useRef(area);
  const key = inputAreaKey(area);
  const isRefreshing = edit || hover || isRefused;

  areaRef.current = area;

  const apply = (): void => setIsRefused(!gameface.setInputArea(areaRef.current));
  const refresh = useInterval(apply, { interval: HUD_OVERLAY.inputAreaRefreshMs, immediately: false });
  const applyNow = useEffectEvent(apply);
  const toggleRefresh = useEffectEvent((isOn: boolean) => {
    if (isOn) {
      refresh.resume();
    } else {
      refresh.pause();
    }
  });

  useEffect(() => {
    if (grabbedId !== null) {
      report('hover');
    }
  }, [grabbedId, report]);

  useEffect(() => applyNow(), [key]);

  useEffect(() => toggleRefresh(isRefreshing), [isRefreshing]);

  useEffect(() => {
    sendHud({ type: 'area', whole: isWhole });
  }, [isWhole]);
};
