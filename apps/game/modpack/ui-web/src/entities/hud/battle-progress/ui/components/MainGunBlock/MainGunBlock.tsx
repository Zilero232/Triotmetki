import clsx from 'clsx';

import { fillScaleStyle } from '@/shared/lib/bar-fill';
import { ClientIcon, HudText, TabularText, toneClass } from '@/ui-kit';

import type { MainGunBlockProps } from './MainGunBlock.types';

import { BATTLE_PROGRESS } from '../../../config';

import s from './MainGunBlock.module.scss';

export const MainGunBlock = ({ view }: MainGunBlockProps) => (
  <div className={s.block}>
    <div className={s.medal}>
      <ClientIcon icon={view.icon} size={BATTLE_PROGRESS.medal.height} width={BATTLE_PROGRESS.medal.width} />
      {view.isReached && <ClientIcon className={s.reached} icon={view.reachedIcon} size={BATTLE_PROGRESS.reachedIconSize} tone='good' />}
    </div>
    <div className={s.body}>
      <div className={s.head}>
        <span className={s.title}>{view.title}</span>
        <HudText className={s.tally} text={view.tally} />
      </div>
      <div className={s.figure}>
        <TabularText className={clsx(s.headline, toneClass(view.tone))} text={view.headline} />
        <HudText className={s.caption} text={view.caption} />
      </div>
      {view.fill !== null && (
        <div className={s.track}>
          <div className={clsx(s.fill, s[view.tone])} style={fillScaleStyle(view.fill)} />
        </div>
      )}
      <HudText className={s.detail} text={view.detail} />
    </div>
  </div>
);
