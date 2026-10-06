import { remRect } from '@/shared/lib/css-unit';

import type { ReticleSketchProps } from './ReticleSketch.types';

import { CROSSHAIR, RETICLE_READOUTS } from '../../../config';
import { sketchRing } from '../../../lib/sketch-ring';

import s from './ReticleSketch.module.scss';

const { canvas } = RETICLE_READOUTS;
const place = remRect({
  left: (canvas.width - CROSSHAIR.reticle) / 2,
  top: (canvas.height - CROSSHAIR.reticle) / 2,
  width: CROSSHAIR.reticle,
  height: CROSSHAIR.reticle
});

export const ReticleSketch = ({ hidesCentre, circle }: ReticleSketchProps) => (
  <div className={s.reticle} style={place}>
    <div className={s.ring} style={sketchRing(circle)} />
    <div className={s.horizontal} />
    <div className={s.vertical} />
    {!hidesCentre && <div className={s.centre} />}
  </div>
);
