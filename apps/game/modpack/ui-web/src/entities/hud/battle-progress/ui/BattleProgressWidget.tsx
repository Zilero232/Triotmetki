import { HudPlate } from '@/ui-kit';

import type { BattleProgressWidgetProps } from './BattleProgressWidget.types';

import { battleProgressView } from '../lib/battle-progress-view';
import { MainGunBlock, Wn8Line } from './components';

import s from './BattleProgressWidget.module.scss';

export const BattleProgressWidget = ({ data }: BattleProgressWidgetProps) => {
  const view = battleProgressView(data);

  return (
    <HudPlate className={s.plate}>
      {view.mainGun !== null && <MainGunBlock view={view.mainGun} />}
      {view.wn8 !== null && <Wn8Line data={view.wn8} isDivided={view.mainGun !== null} />}
    </HudPlate>
  );
};
