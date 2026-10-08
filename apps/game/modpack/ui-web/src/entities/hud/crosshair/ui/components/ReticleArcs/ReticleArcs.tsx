import clsx from 'clsx';

import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';
import { remRect } from '@/shared/lib/css-unit';

import type { ReticleArcsProps } from './ReticleArcs.types';

import { RETICLE_READOUTS } from '../../../config';
import { arcsView } from '../../../lib/reticle-arcs';

import s from './ReticleArcs.module.scss';

const { canvas, arcs: geometry } = RETICLE_READOUTS;
const centre = canvas.height / 2;
const place = remRect({ left: (canvas.width - canvas.height) / 2, top: 0, width: canvas.height, height: canvas.height });

export const ReticleArcs = ({ arcs }: ReticleArcsProps) => {
  const { isIdle, leftTrack, rightTrack, reload, health } = arcsView({ arcs, centre });

  return (
    <span className={clsx(s.arcs, isIdle && s.idle)} style={place}>
      <svg
        aria-hidden='true'
        className={s.svg}
        height='100%'
        viewBox={`0 0 ${String(canvas.height)} ${String(canvas.height)}`}
        width='100%'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d={leftTrack} fill='none' stroke={HUD_FIGURE.empty.color} strokeOpacity={HUD_FIGURE.empty.opacity} strokeWidth={geometry.stroke} />
        <path d={rightTrack} fill='none' stroke={HUD_FIGURE.empty.color} strokeOpacity={HUD_FIGURE.empty.opacity} strokeWidth={geometry.stroke} />
        <path
          d={reload.d}
          fill='none'
          stroke={HUD_FIGURE.index}
          strokeOpacity={reload.isShown ? 1 : 0}
          strokeWidth={reload.isShown ? geometry.stroke : 0}
        />
        <path
          d={health.d}
          fill='none'
          stroke={HUD_TONE_COLORS.ally.hex}
          strokeOpacity={health.isShown ? 1 : 0}
          strokeWidth={health.isShown ? geometry.stroke : 0}
        />
      </svg>
    </span>
  );
};
