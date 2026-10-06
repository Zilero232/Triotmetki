import { rem } from '@/shared/lib/css-unit';
import { TabularText } from '@/ui-kit';

import type { ZoomReadoutProps } from './ZoomReadout.types';

import { RETICLE_READOUTS } from '../../../config';

import s from './ZoomReadout.module.scss';

const { canvas, zoom: geometry } = RETICLE_READOUTS;

export const ZoomReadout = ({ zoom }: ZoomReadoutProps) => (
  <div className={s.anchor} style={{ left: rem(canvas.width / 2 + geometry.offset) }}>
    <span className={s.sign}>x</span>
    <TabularText className={s.value} text={zoom} />
  </div>
);
