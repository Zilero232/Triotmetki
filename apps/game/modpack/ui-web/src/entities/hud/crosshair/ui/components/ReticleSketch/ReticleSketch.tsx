import type { ReticleSketchProps } from './ReticleSketch.types';

import { CROSSHAIR, RETICLE_READOUTS } from '../../../config';
import { sketchRing } from '../../../lib/sketch-ring';

import s from './ReticleSketch.module.scss';

const { canvas } = RETICLE_READOUTS;
const place = {
  top: `${String((canvas.height - CROSSHAIR.reticle) / 2)}rem`,
  left: `${String((canvas.width - CROSSHAIR.reticle) / 2)}rem`,
  width: `${String(CROSSHAIR.reticle)}rem`,
  height: `${String(CROSSHAIR.reticle)}rem`
};

export const ReticleSketch = ({ hidesCentre, circle }: ReticleSketchProps) => (
  <div className={s.reticle} style={place}>
    <div className={s.ring} style={sketchRing(circle)} />
    <div className={s.horizontal} />
    <div className={s.vertical} />
    {!hidesCentre && <div className={s.centre} />}
  </div>
);
