import type { ReticleRepairsProps } from './ReticleRepairs.types';

import { Glyph, TabularText } from '../../../../../../shared/ui/hud';
import { RETICLE_READOUTS } from '../../../config';

import s from './ReticleRepairs.module.scss';

const { canvas, repairs: geometry } = RETICLE_READOUTS;

export const ReticleRepairs = ({ repairs }: ReticleRepairsProps) => (
  <div className={s.repairs} style={{ left: `${String(canvas.width / 2 + geometry.offset)}rem` }}>
    {repairs.map((repair, index) => (
      <div key={`${String(index)}-${repair.glyph}`} className={s.row}>
        <Glyph name={repair.glyph} size={geometry.glyph} tone='warning' />
        <TabularText className={s.seconds} text={repair.seconds} />
      </div>
    ))}
  </div>
);
