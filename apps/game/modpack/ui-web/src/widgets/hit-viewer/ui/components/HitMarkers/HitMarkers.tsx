import { useWindowSize } from '@siberiacancode/reactuse';
import clsx from 'clsx';

import type { HitMarkersProps } from './HitMarkers.types';

import { markerGeometry } from '../../../lib/marker-geometry';

import s from './HitMarkers.module.scss';

export const HitMarkers = ({ marks }: HitMarkersProps) => {
  const screen = useWindowSize().watch();

  if (!marks) {
    return null;
  }

  return (
    <div className={s.layer}>
      {marks.marks.map((mark) => {
        const { x, y, length, angle } = markerGeometry({ mark, screen });
        const isSelected = mark.i === marks.selected;

        return (
          <div key={mark.i} className={clsx(s.marker, s[mark.tone])} style={{ left: x, top: y }}>
            <div className={clsx(s.line, isSelected && s.lineSelected)} style={{ width: length, transform: `rotate(${angle}deg)` }} />
            <div className={clsx(s.dot, isSelected && s.dotSelected)} />
          </div>
        );
      })}
    </div>
  );
};
