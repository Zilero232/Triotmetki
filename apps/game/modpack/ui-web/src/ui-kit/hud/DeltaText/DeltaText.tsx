import clsx from 'clsx';

import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';

import type { DeltaTextProps } from './DeltaText.types';

import { toneClass } from '../tone';
import { HUD_DELTA } from './DeltaText.constants';

import s from './DeltaText.module.scss';

export const DeltaText = ({ text, direction, tone, className }: DeltaTextProps) => {
  const { path, tone: directionTone } = HUD_DELTA[direction];
  const shown = tone ?? directionTone;

  return (
    <span className={clsx(s.delta, toneClass(shown), className)}>
      {path && (
        <span className={s.triangle}>
          <svg
            aria-hidden='true'
            className={s.svg}
            height='100%'
            viewBox={`0 0 ${String(HUD_FIGURE.triangleBox)} ${String(HUD_FIGURE.triangleBox)}`}
            width='100%'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path d={path} fill={HUD_TONE_COLORS[shown].hex} />
          </svg>
        </span>
      )}
      {text}
    </span>
  );
};
