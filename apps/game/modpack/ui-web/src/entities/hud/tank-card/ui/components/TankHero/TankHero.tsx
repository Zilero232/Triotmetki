import { formatPercentOrDash } from '@/shared/lib/format-number';
import { DeltaText, Sparkline, TabularText } from '@/ui-kit';

import type { TankHeroProps } from './TankHero.types';

import { TANK_CARD } from '../../../config';
import { deltaView } from '../../../lib/tank-card-view';

import s from './TankHero.module.scss';

export const TankHero = ({ data }: TankHeroProps) => {
  const delta = deltaView(data.delta);

  return (
    <div className={s.hero}>
      <TabularText className={s.percent} text={formatPercentOrDash({ value: data.percent, digits: 2 })} />
      {delta && <DeltaText className={s.delta} direction={delta.direction} text={delta.text} tone={TANK_CARD.deltaTones[delta.direction]} />}
      <Sparkline className={s.spark} height={TANK_CARD.spark.height} points={data.points} width={TANK_CARD.spark.width} />
    </div>
  );
};
