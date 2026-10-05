import { useInterval, useWindowEvent } from '@siberiacancode/reactuse';
import { useEffect, useEffectEvent, useState } from 'react';
import { isDeepEqual } from 'remeda';

import { gameface } from '@/shared/api/gameface';
import { reportOnce } from '@/shared/lib/page-diag';

import type { Viewport } from '../../../lib/frame';

import { WINDOW_FRAME } from '../../../config';
import { describeViewport } from '../../../lib/describe';
import { readViewport } from '../../../lib/screen';

export const useViewport = (): Viewport => {
  const [viewport, setViewport] = useState<Viewport>(readViewport);

  const check = (): void => {
    const next = readViewport();

    setViewport((current) => {
      if (isDeepEqual(current, next)) {
        return current;
      }

      reportOnce({ kind: 'window viewport changed', text: describeViewport(next) });

      return next;
    });
  };

  const firstCheck = useEffectEvent(check);

  useInterval(check, WINDOW_FRAME.screenCheckMs);
  useWindowEvent('resize', check);

  useEffect(() => {
    const first = setTimeout(firstCheck, 0);

    return () => clearTimeout(first);
  }, []);

  useEffect(() => {
    gameface.setInputArea({ left: 0, top: 0, width: Math.round(viewport.view.width), height: Math.round(viewport.view.height) });
  }, [viewport]);

  return viewport;
};
