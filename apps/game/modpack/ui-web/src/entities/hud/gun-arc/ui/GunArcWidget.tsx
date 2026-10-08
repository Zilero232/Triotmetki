import { remBox } from '@/shared/lib/css-unit';
import { useLastPresent } from '@/shared/lib/use-last-present';

import type { GunArcWidgetProps } from './GunArcWidget.types';

import { GUN_ARC } from '../config';
import { GunArcMarker } from './components';

import s from './GunArcWidget.module.scss';

const { canvas, origin } = GUN_ARC;

export const GunArcWidget = ({ data }: GunArcWidgetProps) => {
  const left = useLastPresent(data.left) ?? origin;
  const right = useLastPresent(data.right) ?? origin;
  const centre = useLastPresent(data.centre) ?? origin;

  return (
    <div className={s.canvas} style={remBox(canvas)}>
      <GunArcMarker isShown={data.left !== null} mark={{ shape: data.marker, side: 'left' }} point={left} />
      <GunArcMarker isShown={data.right !== null} mark={{ shape: data.marker, side: 'right' }} point={right} />
      {data.centre_marker !== 'none' && (
        <GunArcMarker isShown={data.centre !== null} mark={{ shape: data.centre_marker, side: 'centre' }} point={centre} />
      )}
    </div>
  );
};
