import type { DistanceSliderProps } from './DistanceSlider.types';

import { fillLabel } from '../../../../../lib/fill-label';
import { useDistanceSlider } from '../../../../../model/hooks/use-distance-slider';

import s from './DistanceSlider.module.scss';

export const DistanceSlider = ({ label, template, value, limits, onCommit }: DistanceSliderProps) => {
  const slider = useDistanceSlider({ value, limits, onCommit });

  return (
    <div className={s.slider}>
      <div className={s.head}>
        <span className={s.caption}>{label}</span>
        <span className={s.value}>{fillLabel({ template, values: { m: slider.shown } })}</span>
      </div>
      <div
        ref={slider.trackRef}
        aria-label={label}
        aria-valuemax={limits[1]}
        aria-valuemin={limits[0]}
        aria-valuenow={slider.shown}
        className={s.track}
        role='slider'
        tabIndex={-1}
      >
        <div className={s.rail}>
          <div className={s.fill} style={{ width: slider.fill }} />
        </div>
        <div className={s.thumb} style={{ left: slider.fill }} />
      </div>
    </div>
  );
};
