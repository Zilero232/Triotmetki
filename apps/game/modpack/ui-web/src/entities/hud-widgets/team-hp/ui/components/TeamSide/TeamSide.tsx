import clsx from 'clsx';

import type { TeamSideProps } from './TeamSide.types';

import { TabularText, toneClass } from '../../../../../../shared/ui/hud';
import { TeamBar } from '../TeamBar';
import { TeamStrip } from '../TeamStrip';

import s from './TeamSide.module.scss';

export const TeamSide = ({ view, side, mirrored = false }: TeamSideProps) => {
  const hp = view.numbers && (
    <TabularText className={clsx(s.hp, mirrored && s.hpMirrored, toneClass(side.hpTone))} style={side.hpStyle} text={side.hp} />
  );

  return (
    <div className={clsx(s.side, mirrored && s.mirrored)}>
      <div className={s.top}>
        {mirrored && hp}
        {view.bars && <TeamBar mirrored={mirrored} segmented={view.segmented} side={side} />}
        {!mirrored && hp}
      </div>
      {view.strip && <TeamStrip items={side.strip} mirrored={mirrored} />}
    </div>
  );
};
