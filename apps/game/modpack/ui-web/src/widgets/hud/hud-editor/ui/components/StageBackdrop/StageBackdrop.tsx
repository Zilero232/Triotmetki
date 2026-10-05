import clsx from 'clsx';

import { STAGE_STOCK } from '../../../config';

import s from './StageBackdrop.module.scss';

export const StageBackdrop = () => (
  <div aria-hidden='true' className={s.backdrop}>
    <span className={s.guideX} />
    <span className={s.guideY} />
    <span className={s.reticle} />
    <span className={s.reticleDot} />
    {STAGE_STOCK.map((element) => (
      <span key={element.id} className={clsx(s.stock, element.kind === 'minimap' && s.minimap)} style={element.box} />
    ))}
  </div>
);
