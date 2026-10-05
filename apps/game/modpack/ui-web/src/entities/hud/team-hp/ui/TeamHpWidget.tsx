import { HudPlate } from '@/ui-kit';

import type { TeamHpWidgetProps } from './TeamHpWidget.types';

import { teamHpView } from '../lib/team-hp-view';
import { TeamCenter, TeamSide } from './components';

import s from './TeamHpWidget.module.scss';

export const TeamHpWidget = ({ data }: TeamHpWidgetProps) => {
  const view = teamHpView(data);

  return (
    <HudPlate className={s.plate} fill='centre'>
      <div className={s.row}>
        <TeamSide mirrored side={view.allies} view={view} />
        <TeamCenter view={view} />
        <TeamSide side={view.enemies} view={view} />
      </div>
    </HudPlate>
  );
};
