import clsx from 'clsx';

import { DeltaText, IndexMark, TabularText, toneClass } from '@/ui-kit';

import type { MarksHeadProps } from './MarksHead.types';

import { MARKS_PANEL } from '../../../config';
import { useMarksHead } from '../../../model/hooks';

import s from './MarksHead.module.scss';

export const MarksHead = ({ view, hero = false }: MarksHeadProps) => {
  const head = useMarksHead(view);

  return (
    <div className={clsx(s.head, hero && s.hero)}>
      <IndexMark className={s.index} lit={view.stars} />
      {view.approx && <span className={s.approx}>{MARKS_PANEL.approx}</span>}
      <span key={head.pulse} className={clsx(s.value, head.pulse > 0 && s.pulse)}>
        <TabularText className={clsx(s.percent, hero && s.heroPercent, toneClass(view.tone))} text={head.percent} />
      </span>
      {head.delta !== null && <DeltaText className={s.delta} direction={view.direction} text={head.delta} />}
      {view.note !== null && <span className={s.note}>{view.note}</span>}
    </div>
  );
};
