import clsx from 'clsx';

import type { TeamCenterProps } from './TeamCenter.types';

import { TabularText, toneClass } from '../../../../../../shared/ui/hud';

import s from './TeamCenter.module.scss';

export const TeamCenter = ({ view }: TeamCenterProps) =>
  view.hasCenter ? (
    <div className={s.center}>
      <div className={s.top}>
        {view.score && (
          <>
            <TabularText className={clsx(s.frags, s.fragsAllies)} text={view.score.allies} />
            <span className={s.colon}>:</span>
            <TabularText className={s.frags} text={view.score.enemies} />
          </>
        )}
      </div>
      {view.secondRow && <span className={clsx(s.bottom, toneClass(view.diffTone))}>{view.diff}</span>}
    </div>
  ) : (
    <div className={s.split} />
  );
