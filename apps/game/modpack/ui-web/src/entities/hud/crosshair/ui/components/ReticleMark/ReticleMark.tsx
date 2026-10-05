import type { ReticleMarkProps } from './ReticleMark.types';

import { RETICLE_MARKS } from '../../../config';
import { reticleMarkPrimitives } from '../../../lib/reticle-mark';

import s from './ReticleMark.module.scss';

export const ReticleMark = ({ shape, size, color, outline }: ReticleMarkProps) => {
  const { paint } = RETICLE_MARKS;
  const colours = { mark: color ?? paint.mark, outline: paint.outline, shade: paint.outline };
  const opacities = { mark: 1, outline: paint.outlineOpacity, shade: paint.shadeOpacity };

  return (
    <span className={s.mark} style={{ width: `${String(size)}rem`, height: `${String(size)}rem` }}>
      <svg aria-hidden='true' height='100%' viewBox={`0 0 ${String(size)} ${String(size)}`} width='100%' xmlns='http://www.w3.org/2000/svg'>
        {reticleMarkPrimitives({ shape, size, outline }).map((primitive, index) =>
          primitive.stroke === null ? (
            <path
              key={`${String(index)}-${primitive.paint}`}
              d={primitive.d}
              fill={colours[primitive.paint]}
              fillOpacity={opacities[primitive.paint]}
            />
          ) : (
            <path
              key={`${String(index)}-${primitive.paint}`}
              d={primitive.d}
              fill='none'
              stroke={colours[primitive.paint]}
              strokeLinecap='square'
              strokeOpacity={opacities[primitive.paint]}
              strokeWidth={primitive.stroke}
            />
          )
        )}
      </svg>
    </span>
  );
};
