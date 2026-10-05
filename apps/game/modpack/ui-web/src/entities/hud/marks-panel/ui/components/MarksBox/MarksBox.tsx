import { ThresholdScale } from '@/ui-kit';

import type { MarksBoxProps } from './MarksBox.types';

import { MARKS_PANEL } from '../../../config';
import { MarksHead } from '../MarksHead';

import s from './MarksBox.module.scss';

export const MarksBox = ({ view }: MarksBoxProps) => (
  <div className={s.box}>
    <MarksHead view={view} />
    <ThresholdScale
      className={s.scale}
      cursor={view.projected}
      labels={view.showScaleLabels}
      levels={MARKS_PANEL.levels}
      value={view.start}
      width={MARKS_PANEL.box.scale}
    />
  </div>
);
