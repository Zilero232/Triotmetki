import { remBox } from '@/shared/lib/css-unit';

import type { GunArcWidgetProps } from './GunArcWidget.types';

import { GUN_ARC } from '../config';
import { GunArcMarker } from './components';

import s from './GunArcWidget.module.scss';

const { canvas } = GUN_ARC;

export const GunArcWidget = ({ data }: GunArcWidgetProps) => (
  <div className={s.canvas} style={remBox(canvas)}>
    {data.left && <GunArcMarker mark={{ shape: data.marker, side: 'left' }} point={data.left} />}
    {data.right && <GunArcMarker mark={{ shape: data.marker, side: 'right' }} point={data.right} />}
    {data.centre && data.centre_marker !== 'none' && <GunArcMarker mark={{ shape: data.centre_marker, side: 'centre' }} point={data.centre} />}
  </div>
);
