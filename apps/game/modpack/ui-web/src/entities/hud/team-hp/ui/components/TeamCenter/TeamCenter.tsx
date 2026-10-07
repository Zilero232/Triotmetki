import clsx from 'clsx';

import { TabularText, toneClass } from '@/ui-kit';

import type { TeamCenterProps } from './TeamCenter.types';

import { TEAM_HP } from '../../../config';

import s from './TeamCenter.module.scss';

export const TeamCenter = ({ view }: TeamCenterProps) =>
  view.hasCenter ? (
    <div className={s.center}>
      <div className={s.top}>
        {view.score && (
          <>
            <TabularText className={clsx(s.frags, s.fragsAllies)} digitWidth={TEAM_HP.digitWidth.score} text={view.score.allies} />
            <span className={s.colon}>:</span>
            <TabularText className={s.frags} digitWidth={TEAM_HP.digitWidth.score} text={view.score.enemies} />
          </>
        )}
      </div>
      {view.secondRow && <span className={clsx(s.bottom, toneClass(view.diffTone))}>{view.diff}</span>}
    </div>
  ) : (
    <div className={s.split} />
  );
