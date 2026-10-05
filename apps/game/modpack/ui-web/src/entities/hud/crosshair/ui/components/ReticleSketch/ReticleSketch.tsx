import type { ReticleSketchProps } from './ReticleSketch.types';

import { CROSSHAIR, RETICLE_READOUTS } from '../../../config';

import s from './ReticleSketch.module.scss';

const { canvas } = RETICLE_READOUTS;
const place = {
  top: `${String((canvas.height - CROSSHAIR.reticle) / 2)}rem`,
  left: `${String((canvas.width - CROSSHAIR.reticle) / 2)}rem`,
  width: `${String(CROSSHAIR.reticle)}rem`,
  height: `${String(CROSSHAIR.reticle)}rem`
};

export const ReticleSketch = ({ hidesCentre }: ReticleSketchProps) => (
  <div className={s.reticle} style={place}>
    <div className={s.ring} />
    <div className={s.horizontal} />
    <div className={s.vertical} />
    {!hidesCentre && <div className={s.centre} />}
  </div>
);
