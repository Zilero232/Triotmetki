import type { ReticleSketchProps } from './ReticleSketch.types';

import { CROSSHAIR } from '../../../config';

import s from './ReticleSketch.module.scss';

export const ReticleSketch = ({ hidesCentre }: ReticleSketchProps) => (
  <div className={s.reticle} style={{ width: `${String(CROSSHAIR.reticle)}rem`, height: `${String(CROSSHAIR.reticle)}rem` }}>
    <div className={s.ring} />
    <div className={s.horizontal} />
    <div className={s.vertical} />
    {!hidesCentre && <div className={s.centre} />}
  </div>
);
