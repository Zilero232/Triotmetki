import { useWindowEvent } from '@siberiacancode/reactuse';
import { useEffect, useEffectEvent, useState } from 'react';

import type { ClientSize } from '@/shared/api/gameface';

import { readScreen } from '@/entities/hud/panel-layout';
import { gameface } from '@/shared/api/gameface';

import { viewerFrame } from '../../../lib/viewer-frame';

export const useViewerFrame = () => {
  const [screen, setScreen] = useState<ClientSize>(readScreen);

  const check = (): void => {
    const next = readScreen();

    gameface.fitView();
    setScreen((current) => (current.width === next.width && current.height === next.height ? current : next));
  };

  const onScreenChanged = useEffectEvent(check);

  useEffect(() => {
    gameface.onScreenChanged(() => onScreenChanged());
  }, []);

  useWindowEvent('resize', check);

  const frame = viewerFrame({ screen });

  return { width: `${String(frame.width)}rem`, height: `${String(frame.height)}rem`, transform: `scale(${String(frame.scale)})` };
};
