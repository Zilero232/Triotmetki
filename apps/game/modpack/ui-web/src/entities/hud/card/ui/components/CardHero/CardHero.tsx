import { HUD_TONE_COLORS } from '@/shared/config';
import { Sparkline, TankSilhouette, ThresholdScale } from '@/ui-kit';

import type { CardHeroProps } from './CardHero.types';

import { CARD } from '../../../config';

import s from './CardHero.module.scss';

export const CardHero = ({ hero }: CardHeroProps) => (
  <div className={s.hero}>
    <div className={s.top}>
      <TankSilhouette color={HUD_TONE_COLORS[hero.tone].hex} fill={hero.fill ?? 0} shape={hero.shape} tick={hero.tick} width={CARD.hero.silhouette} />
      <Sparkline className={s.spark} height={CARD.hero.sparkHeight} points={hero.points} width={CARD.hero.sparkWidth} />
    </div>
    <ThresholdScale labels cursor={hero.fill} levels={CARD.hero.levels} value={hero.fill} width={CARD.hero.scale} />
  </div>
);
