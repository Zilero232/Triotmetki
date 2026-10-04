import type { MarksSilhouetteProps } from './MarksSilhouette.types';

import { TankSilhouette, ThresholdScale } from '../../../../../../shared/ui/hud';
import { MARKS_PANEL } from '../../../config';
import { MarksHead } from '../MarksHead';

import s from './MarksSilhouette.module.scss';

export const MarksSilhouette = ({ view }: MarksSilhouetteProps) => (
  <div className={s.large}>
    <TankSilhouette
      className={s.tank}
      color={view.fillColor}
      fill={view.projected ?? 0}
      shape={view.silhouette}
      tick={view.next}
      width={MARKS_PANEL.large.silhouette}
    />
    <MarksHead hero view={view} />
    <ThresholdScale labels cursor={view.projected} levels={MARKS_PANEL.levels} value={view.start} width={MARKS_PANEL.large.scale} />
  </div>
);
