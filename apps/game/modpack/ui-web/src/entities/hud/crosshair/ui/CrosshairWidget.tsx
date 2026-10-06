import { ClientIcon } from '@/ui-kit';

import type { CrosshairWidgetProps } from './CrosshairWidget.types';

import { RETICLE_READOUTS } from '../config';
import { ReloadBox, ReticleArcs, ReticleMark, ReticleSketch, ZoomReadout } from './components';

import s from './CrosshairWidget.module.scss';

export const CrosshairWidget = ({ data }: CrosshairWidgetProps) => {
  const readouts = data.readouts;

  return (
    <div
      className={s.canvas}
      style={{ width: `${String(RETICLE_READOUTS.canvas.width)}rem`, height: `${String(RETICLE_READOUTS.canvas.height)}rem` }}
    >
      {data.sketch && <ReticleSketch circle={data.circle} hidesCentre={data.hides_centre} />}
      {readouts?.arcs && <ReticleArcs arcs={readouts.arcs} />}
      <div className={s.centre}>
        {data.shape !== null && <ReticleMark color={data.color} outline={data.outline} shape={data.shape} size={data.size} />}
        {data.mark !== null && <ClientIcon className={s.image} icon={data.mark} size={data.size} />}
      </div>
      {readouts?.reload && <ReloadBox reload={readouts.reload} />}
      {readouts?.zoom && <ZoomReadout zoom={readouts.zoom} />}
    </div>
  );
};
