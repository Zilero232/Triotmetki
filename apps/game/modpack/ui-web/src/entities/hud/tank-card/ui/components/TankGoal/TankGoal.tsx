import { HudText } from '@/ui-kit';

import type { TankGoalProps } from './TankGoal.types';

import s from './TankGoal.module.scss';

export const TankGoal = ({ goal }: TankGoalProps) => (
  <div className={s.goal}>
    <span className={s.label}>{goal.label}</span>
    <HudText className={s.value} text={goal.value} />
    <HudText className={s.note} text={goal.note} />
    <HudText className={s.battles} text={goal.battles} />
  </div>
);
