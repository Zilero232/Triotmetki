import clsx from 'clsx';

import { fillScaleStyle } from '@/shared/lib/bar-fill';
import { rem } from '@/shared/lib/css-unit';

import type { TeamBarProps } from './TeamBar.types';

import { TEAM_HP } from '../../../config';

import s from './TeamBar.module.scss';

export const TeamBar = ({ side, segmented, mirrored = false }: TeamBarProps) => {
  const fill = clsx(s.fill, mirrored && s.fillEnd, side.paint.tone && s[side.paint.tone]);

  return (
    <div className={s.frame}>
      <div className={clsx(s.bar, segmented && s.plain, mirrored && s.mirrored)} style={{ width: rem(TEAM_HP.barWidth) }}>
        {segmented ? (
          side.segments.map((item) =>
            item.kind === 'gap' ? (
              <div key={item.key} className={s.gap} style={{ width: rem(TEAM_HP.tierGap) }} />
            ) : (
              <div key={item.key} className={clsx(s.segment, mirrored && s.mirrored, !item.alive && s.dead)} style={{ width: rem(item.width) }}>
                <div className={fill} style={{ ...side.paint.fill, ...fillScaleStyle(item.fill / item.width) }} />
              </div>
            )
          )
        ) : (
          <div className={fill} style={{ ...side.paint.fill, ...fillScaleStyle(side.fill / TEAM_HP.barWidth) }} />
        )}
      </div>
    </div>
  );
};
