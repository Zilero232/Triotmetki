import { remSquare } from '@/shared/lib/css-unit';

import type { ReticleMarkProps } from './ReticleMark.types';

import { RETICLE_MARKS } from '../../../config';
import { reticleMarkPrimitives } from '../../../lib/reticle-mark';

import s from './ReticleMark.module.scss';

export const ReticleMark = ({ shape, size, color, outline }: ReticleMarkProps) => {
  const { paint } = RETICLE_MARKS;
  const colours = { mark: color ?? paint.mark, outline: paint.outline, shade: paint.outline };

  return (
    <span className={s.mark} style={remSquare(size)}>
      <svg
        key={`${shape}-${String(size)}-${String(outline)}`}
        aria-hidden='true'
        className={s.svg}
        height='100%'
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        width='100%'
        xmlns='http://www.w3.org/2000/svg'
      >
        {reticleMarkPrimitives({ shape, size, outline }).map((primitive, index) =>
          primitive.stroke === null ? (
            <path
              key={`${String(index)}-${primitive.paint}`}
              d={primitive.d}
              fill={colours[primitive.paint]}
              fillOpacity={paint.opacity[primitive.paint]}
            />
          ) : (
            <path
              key={`${String(index)}-${primitive.paint}`}
              d={primitive.d}
              fill='none'
              stroke={colours[primitive.paint]}
              strokeLinecap='square'
              strokeOpacity={paint.opacity[primitive.paint]}
              strokeWidth={primitive.stroke}
            />
          )
        )}
      </svg>
    </span>
  );
};
