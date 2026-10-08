import { remBox } from '@/shared/lib/css-unit';
import { ClientIcon } from '@/ui-kit';

import type { CrosshairWidgetProps } from './CrosshairWidget.types';

import { RETICLE_READOUTS } from '../config';
import { useShownMark } from '../model/hooks';
import { ReloadBox, ReticleArcs, ReticleMark, ReticleSketch, ZoomReadout } from './components';

import s from './CrosshairWidget.module.scss';

export const CrosshairWidget = ({ data }: CrosshairWidgetProps) => {
  const readouts = data.readouts;
  const mark = useShownMark(data);

  return (
    <div className={s.canvas} style={remBox(RETICLE_READOUTS.canvas)}>
      {data.sketch && <ReticleSketch circle={data.circle} hidesCentre={data.hides_centre} />}
      <ReticleArcs arcs={readouts?.arcs ?? null} />
      <div className={s.centre}>
        {mark && <ReticleMark color={mark.color} isShown={mark.isShown} outline={mark.outline} shape={mark.shape} size={mark.size} />}
        {data.mark !== null && <ClientIcon className={s.image} icon={data.mark} size={data.size} />}
      </div>
      {readouts?.reload && <ReloadBox reload={readouts.reload} />}
      {readouts?.zoom && <ZoomReadout zoom={readouts.zoom} />}
    </div>
  );
};
