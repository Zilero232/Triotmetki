import { useWindowEvent } from '@siberiacancode/reactuse';
import { useEffect, useEffectEvent, useState } from 'react';
import { isDeepEqual } from 'remeda';

import { readScreen } from '@/entities/hud/panel-layout';
import { gameface } from '@/shared/api/gameface';

import type { ViewerFrame } from '../../../lib/viewer-frame';

import { rem, viewerFrame } from '../../../lib/viewer-frame';
import { sendViewer } from '../../../lib/viewer-protocol';

const readFrame = (): ViewerFrame => viewerFrame({ screen: readScreen(), view: gameface.viewRect() });

const describeFrame = (frame: ViewerFrame): string => {
  const screen = readScreen();
  const view = gameface.viewRect();
  const where = view ? `${view.x},${view.y} ${view.width}x${view.height}` : 'unknown';
  const size = `${frame.width.toFixed(0)}x${frame.height.toFixed(0)}`;

  return `screen ${screen.width}x${screen.height} rem, view ${where}, frame ${size} at ${frame.left},${frame.top} scale ${frame.scale.toFixed(2)}`;
};

export const useViewerFrame = () => {
  const [frame, setFrame] = useState<ViewerFrame>(readFrame);

  const check = (): void => {
    gameface.fitView();

    const next = readFrame();

    setFrame((current) => (isDeepEqual(current, next) ? current : next));
  };

  const onScreenChanged = useEffectEvent(check);

  useEffect(() => {
    gameface.onScreenChanged(() => onScreenChanged());
  }, []);

  useEffect(() => {
    sendViewer({ command: 'diag', text: describeFrame(frame) });
  }, [frame]);

  useWindowEvent('resize', check);

  return {
    left: rem(frame.left),
    top: rem(frame.top),
    width: rem(frame.width),
    height: rem(frame.height),
    transform: `scale(${String(frame.scale)})`
  };
};
