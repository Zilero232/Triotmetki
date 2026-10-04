import clsx from 'clsx';

import type { TeamBarProps } from './TeamBar.types';

import { TEAM_HP } from '../../../config';

import s from './TeamBar.module.scss';

export const TeamBar = ({ side, segmented, mirrored = false }: TeamBarProps) => {
  const fill = clsx(s.fill, side.paint.tone && s[side.paint.tone]);

  return (
    <div className={s.frame}>
      <div className={clsx(s.bar, segmented && s.plain, mirrored && s.mirrored)} style={{ width: `${TEAM_HP.barWidth}rem` }}>
        {segmented ? (
          side.segments.map((item) =>
            item.kind === 'gap' ? (
              <div key={item.key} className={s.gap} style={{ width: `${TEAM_HP.tierGap}rem` }} />
            ) : (
              <div key={item.key} className={clsx(s.segment, mirrored && s.mirrored, !item.alive && s.dead)} style={{ width: `${item.width}rem` }}>
                <div className={fill} style={{ ...side.paint.fill, width: `${item.fill}rem` }} />
              </div>
            )
          )
        ) : (
          <div className={fill} style={{ ...side.paint.fill, width: `${side.fill}rem` }} />
        )}
      </div>
    </div>
  );
};
