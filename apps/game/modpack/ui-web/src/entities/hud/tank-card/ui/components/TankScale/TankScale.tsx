import clsx from 'clsx';

import { fillScaleStyle, slideStyle } from '@/shared/lib/bar-fill';

import type { TankScaleProps } from './TankScale.types';

import { scaleMarks, scalePosition } from '../../../lib/tank-card-view';

import s from './TankScale.module.scss';

const at = (share: number) => ({ left: `${String(share)}%` });

export const TankScale = ({ data }: TankScaleProps) => {
  const marks = scaleMarks({ thresholds: data.thresholds, percent: data.percent });
  const position = data.percent === null ? null : scalePosition(data.percent);

  return (
    <div className={clsx(s.scale, data.thresholds.length === 0 && s.bare)}>
      <div className={s.track}>
        {position !== null && <div className={s.fill} style={fillScaleStyle(position / 100)} />}
        {marks
          .filter((mark) => !mark.isEnd)
          .map((mark) => (
            <span key={mark.level} className={s.gap} style={at(mark.at)} />
          ))}
        {position !== null && (
          <span className={s.slide} style={slideStyle(position)}>
            <span className={s.cursor} />
          </span>
        )}
      </div>
      {marks.map((mark) => (
        <span key={mark.level} className={clsx(s.mark, mark.isEnd && s.end)} style={mark.isEnd ? undefined : at(mark.at)}>
          <span className={clsx(s.level, mark.reached && s.reached)}>{mark.label}</span>
          {mark.average !== null && <span className={s.average}>{mark.average}</span>}
        </span>
      ))}
    </div>
  );
};
