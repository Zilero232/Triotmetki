import { HudPlate, HudText } from '@/ui-kit';

import type { TankCardWidgetProps } from './TankCardWidget.types';

import { TankGoal, TankHeader, TankHero, TankScale, TankSection } from './components';

import s from './TankCardWidget.module.scss';

export const TankCardWidget = ({ data }: TankCardWidgetProps) => {
  const hasMarks = data.percent !== null || data.goal !== null || data.note !== null;

  return (
    <HudPlate className={s.plate}>
      <div className={s.box}>
        <TankHeader data={data} />
        {hasMarks && <TankHero data={data} />}
        {hasMarks && <TankScale data={data} />}
        {data.goal && <TankGoal goal={data.goal} />}
        <HudText className={s.note} text={data.note} />
        {data.sections.map((section) => (
          <TankSection key={section.title} section={section} />
        ))}
      </div>
    </HudPlate>
  );
};
