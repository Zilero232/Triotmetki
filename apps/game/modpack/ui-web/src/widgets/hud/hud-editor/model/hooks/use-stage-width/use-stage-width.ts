import { useWindowEvent } from '@siberiacancode/reactuse';
import { useRef, useState } from 'react';
import { isDeepEqual } from 'remeda';

import type { Size } from '@/entities/hud/panel-layout';

import { rootScale } from '@/shared/lib/design-screen';
import { useMeasureFrames } from '@/shared/lib/use-measure-frames';

import type { RoomInput, UseStageWidthInput } from './use-stage-width.types';

import { HUD_EDITOR } from '../../../config';
import { stageWidthFor } from '../../../lib/panel-view';

const clippingAncestor = (element: HTMLElement): HTMLElement | null => {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (getComputedStyle(parent).overflow === 'hidden') {
      return parent;
    }
  }

  return null;
};

const roomOf = ({ box, stage }: RoomInput): Size => {
  const scale = rootScale();
  const clip = clippingAncestor(box);
  const chrome = box.offsetHeight - (stage?.offsetHeight ?? 0);
  const height = clip ? clip.clientHeight - box.offsetTop - chrome - HUD_EDITOR.stage.bottomGap : Number.POSITIVE_INFINITY;

  return { width: Math.floor(box.offsetWidth / scale), height: Math.floor(height / scale) };
};

export const useStageWidth = ({ stageRef, screen }: UseStageWidthInput) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Size>({ width: HUD_EDITOR.stage.width, height: Number.POSITIVE_INFINITY });
  const measure = (): void => {
    const box = boxRef.current;

    if (!box || box.offsetWidth <= 0) {
      return;
    }

    const next = roomOf({ box, stage: stageRef.current });

    setRoom((current) => (isDeepEqual(current, next) ? current : next));
  };

  useMeasureFrames({ measure, frames: HUD_EDITOR.stage.measureFrames, restartKey: `${String(screen.width)}x${String(screen.height)}` });
  useWindowEvent('resize', measure);

  return { boxRef, width: stageWidthFor({ room, screen }) };
};
