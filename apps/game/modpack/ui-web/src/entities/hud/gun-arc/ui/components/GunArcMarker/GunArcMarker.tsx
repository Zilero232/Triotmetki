import clsx from 'clsx';

import { remRect } from '@/shared/lib/css-unit';

import type { GunArcMarkerProps } from './GunArcMarker.types';

import { GUN_ARC } from '../../../config';
import { markerPath } from '../../../lib/marker-path';
import { markerPlace } from '../../../lib/marker-place';

import s from './GunArcMarker.module.scss';

const { box, paint } = GUN_ARC;

export const GunArcMarker = ({ mark, point, isShown }: GunArcMarkerProps) => {
  const { d, filled } = markerPath(mark);
  const place = markerPlace(point);

  return (
    <span className={clsx(s.marker, !isShown && s.idle)} style={remRect({ ...place, ...box })}>
      <svg
        key={String(filled)}
        aria-hidden='true'
        className={s.svg}
        height='100%'
        viewBox={`0 0 ${String(box.width)} ${String(box.height)}`}
        width='100%'
        xmlns='http://www.w3.org/2000/svg'
      >
        {filled ? (
          <path d={d} fill={paint.mark} stroke={paint.outline} strokeOpacity={paint.outlineOpacity} strokeWidth={paint.fillOutline} />
        ) : (
          <>
            <path
              d={d}
              fill='none'
              stroke={paint.outline}
              strokeLinecap='square'
              strokeOpacity={paint.outlineOpacity}
              strokeWidth={paint.outlineStroke}
            />
            <path d={d} fill='none' stroke={paint.mark} strokeLinecap='square' strokeWidth={paint.stroke} />
          </>
        )}
      </svg>
    </span>
  );
};
