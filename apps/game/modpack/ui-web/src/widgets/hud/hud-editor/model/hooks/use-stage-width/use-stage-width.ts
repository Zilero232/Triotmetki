import { useWindowEvent } from '@siberiacancode/reactuse';
import { useRef, useState } from 'react';

import type { Size } from '@/entities/hud/panel-layout';

import { rootScale } from '@/shared/lib/design-screen';
import { useMeasureFrames } from '@/shared/lib/use-measure-frames';

import { HUD_EDITOR } from '../../../config';
import { stageWidthFor } from '../../../lib/panel-view';

export const useStageWidth = (screen: Size) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [roomWidth, setRoomWidth] = useState<number>(HUD_EDITOR.stage.width);
  const measure = (): void => {
    const box = boxRef.current;

    if (!box || box.offsetWidth <= 0) {
      return;
    }

    setRoomWidth(Math.floor(box.offsetWidth / rootScale()));
  };

  useMeasureFrames({ measure, frames: HUD_EDITOR.stage.measureFrames, restartKey: `${String(screen.width)}x${String(screen.height)}` });
  useWindowEvent('resize', measure);

  return { boxRef, width: stageWidthFor(roomWidth) };
};
