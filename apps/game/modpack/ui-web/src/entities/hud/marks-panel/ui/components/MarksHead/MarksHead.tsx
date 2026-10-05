import clsx from 'clsx';

import { DeltaText, IndexMark, TabularText, toneClass } from '@/ui-kit';

import type { MarksHeadProps } from './MarksHead.types';

import { MARKS_PANEL } from '../../../config';
import { LevelNeed } from '../LevelNeed';

import s from './MarksHead.module.scss';

export const MarksHead = ({ view, hero = false }: MarksHeadProps) => (
  <div className={clsx(s.head, hero && s.hero)}>
    <IndexMark className={s.index} lit={view.stars} />
    {view.approx && <span className={s.approx}>{MARKS_PANEL.approx}</span>}
    <TabularText className={clsx(s.percent, hero && s.heroPercent, toneClass(view.tone))} text={view.percent} />
    {view.delta !== null && <DeltaText className={s.delta} direction={view.direction} text={view.delta} />}
    {view.goal !== null && (
      <span className={s.goal}>
        <LevelNeed level={view.goal} needClassName={s.need} />
      </span>
    )}
    {view.note !== null && <span className={s.note}>{view.note}</span>}
  </div>
);
