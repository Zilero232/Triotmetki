import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';

import type { ReticleArcsProps } from './ReticleArcs.types';

import { RETICLE_READOUTS } from '../../../config';
import { arcPath } from '../../../lib/reticle-arcs';

import s from './ReticleArcs.module.scss';

const { canvas, arcs: geometry } = RETICLE_READOUTS;
const centre = canvas.height / 2;

export const ReticleArcs = ({ arcs }: ReticleArcsProps) => {
  const track = { left: arcPath({ side: 'left', progress: 1, centre }), right: arcPath({ side: 'right', progress: 1, centre }) };
  const reload = arcs.reload === null ? null : arcPath({ side: 'left', progress: arcs.reload, centre });
  const health = arcs.health === null ? null : arcPath({ side: 'right', progress: arcs.health, centre });

  return (
    <span className={s.arcs} style={{ width: `${String(canvas.height)}rem`, height: `${String(canvas.height)}rem` }}>
      <svg
        aria-hidden='true'
        height='100%'
        viewBox={`0 0 ${String(canvas.height)} ${String(canvas.height)}`}
        width='100%'
        xmlns='http://www.w3.org/2000/svg'
      >
        {[track.left, track.right].map(
          (d) =>
            d && (
              <path
                key={d}
                d={d}
                fill='none'
                stroke={HUD_FIGURE.empty.color}
                strokeOpacity={HUD_FIGURE.empty.opacity}
                strokeWidth={geometry.stroke}
              />
            )
        )}
        {reload && <path d={reload} fill='none' stroke={HUD_FIGURE.index} strokeWidth={geometry.stroke} />}
        {health && <path d={health} fill='none' stroke={HUD_TONE_COLORS.ally.hex} strokeWidth={geometry.stroke} />}
      </svg>
    </span>
  );
};
