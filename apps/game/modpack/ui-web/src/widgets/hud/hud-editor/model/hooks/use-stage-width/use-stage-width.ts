import { useWindowEvent } from '@siberiacancode/reactuse';
import { useLayoutEffect, useRef, useState } from 'react';

import type { Size } from '@/entities/hud/panel-layout';

import { rootScale } from '@/shared/lib/design-screen';

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
  const measureRef = useRef(() => {});

  measureRef.current = () => {
    const box = boxRef.current;

    if (box && box.offsetWidth > 0) {
      const next = roomOf({ box, stage: stageRef.current });

      setRoom((current) => (current.width === next.width && current.height === next.height ? current : next));
    }
  };

  useLayoutEffect(() => {
    let left = HUD_EDITOR.stage.measureFrames;
    let frame = 0;

    const step = () => {
      measureRef.current();
      left -= 1;
      frame = left > 0 ? requestAnimationFrame(step) : 0;
    };

    measureRef.current();
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  });

  useWindowEvent('resize', () => measureRef.current());

  return { boxRef, width: stageWidthFor({ room, screen }) };
};
