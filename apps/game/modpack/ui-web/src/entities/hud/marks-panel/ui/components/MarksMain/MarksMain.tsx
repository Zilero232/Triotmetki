import clsx from 'clsx';

import { ClientIcon, HudText, toneClass } from '@/ui-kit';

import type { MarksMainProps } from './MarksMain.types';

import { MARKS_PANEL } from '../../../config';
import { LevelNeed } from '../LevelNeed';

import s from './MarksMain.module.scss';

export const MarksMain = ({ view }: MarksMainProps) => (
  <div className={s.main}>
    <ClientIcon className={s.mark} icon={view.mark} size={MARKS_PANEL.markSize} />
    {view.approx && <span className={s.approx}>{MARKS_PANEL.approx}</span>}
    <span className={clsx(s.percent, toneClass(view.tone))}>{view.percent}</span>
    <HudText className={clsx(s.delta, toneClass(view.deltaTone))} text={view.delta} />
    {view.goal !== null && (
      <span className={s.goal}>
        <LevelNeed level={view.goal} needClassName={s.need} />
      </span>
    )}
    <HudText className={s.note} text={view.note} />
  </div>
);
