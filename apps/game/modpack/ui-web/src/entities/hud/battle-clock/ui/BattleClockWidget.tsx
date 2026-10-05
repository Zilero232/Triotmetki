import { ClientIcon } from '@/ui-kit';

import type { BattleClockWidgetProps } from './BattleClockWidget.types';

import s from './BattleClockWidget.module.scss';

export const BattleClockWidget = ({ data }: BattleClockWidgetProps) => (
  <div className={s.clock}>
    {data.timer && <span className={s.timer}>{data.timer}</span>}
    <div className={s.row}>
      <ClientIcon icon={data.icon} size={16} tone='muted' />
      <span className={s.time}>{data.time}</span>
    </div>
  </div>
);
