import clsx from 'clsx';
import { clamp } from 'remeda';

import type { ThresholdScaleProps } from './ThresholdScale.types';

import s from './ThresholdScale.module.scss';

const at = (value: number): string => `${String(clamp(value, { min: 0, max: 100 }))}%`;

export const ThresholdScale = ({ value, cursor = null, levels, labels = false, width, className }: ThresholdScaleProps) => {
  const isReached = (level: number): boolean => value !== null && value >= level;

  return (
    <div className={clsx(s.scale, labels && s.labelled, className)} style={{ width: `${String(width)}rem` }}>
      <div className={s.track}>
        <div className={s.fill} style={{ width: at(value ?? 0) }} />
        {levels.map((level) => (
          <span key={level} className={clsx(s.tick, isReached(level) && s.reached)} style={{ left: at(level) }} />
        ))}
        {cursor !== null && <span className={s.cursor} style={{ left: at(cursor) }} />}
      </div>
      {labels &&
        levels.map((level) => (
          <span key={level} className={clsx(s.label, isReached(level) && s.labelReached)} style={{ left: at(level) }}>
            {String(level)}
          </span>
        ))}
    </div>
  );
};
