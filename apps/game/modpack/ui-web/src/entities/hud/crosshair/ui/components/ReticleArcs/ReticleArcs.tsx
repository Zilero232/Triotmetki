import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';
import { remRect } from '@/shared/lib/css-unit';
import { RADIAL } from '@/shared/lib/radial';

import type { ReticleArcsProps } from './ReticleArcs.types';

import { RETICLE_READOUTS } from '../../../config';
import { arcPath } from '../../../lib/reticle-arcs';

import s from './ReticleArcs.module.scss';

const { canvas, arcs: geometry } = RETICLE_READOUTS;
const centre = canvas.height / 2;
const place = remRect({ left: (canvas.width - canvas.height) / 2, top: 0, width: canvas.height, height: canvas.height });

export const ReticleArcs = ({ arcs }: ReticleArcsProps) => {
  const track = { left: arcPath({ side: 'left', progress: 1, centre }), right: arcPath({ side: 'right', progress: 1, centre }) };
  const reload = arcs.reload === null ? null : arcPath({ side: 'left', progress: arcs.reload, centre });
  const health = arcs.health === null ? null : arcPath({ side: 'right', progress: arcs.health, centre });

  return (
    <span className={s.arcs} style={place}>
      <svg
        aria-hidden='true'
        className={s.svg}
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
        <path
          d={reload || RADIAL.emptyPath}
          fill='none'
          stroke={HUD_FIGURE.index}
          strokeOpacity={reload ? 1 : 0}
          strokeWidth={reload ? geometry.stroke : 0}
        />
        <path
          d={health || RADIAL.emptyPath}
          fill='none'
          stroke={HUD_TONE_COLORS.ally.hex}
          strokeOpacity={health ? 1 : 0}
          strokeWidth={health ? geometry.stroke : 0}
        />
      </svg>
    </span>
  );
};
