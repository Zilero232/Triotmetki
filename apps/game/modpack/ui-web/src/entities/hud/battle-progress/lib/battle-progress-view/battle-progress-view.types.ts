import type { HudTone } from '@/ui-kit';

import type { Wn8Data } from '../../model/schemas';

export type MainGunView = {
  title: string;
  icon: string | null;
  reachedIcon: string | null;
  isReached: boolean;
  tone: HudTone;
  headline: string;
  caption: string | null;
  tally: string | null;
  fill: number | null;
  detail: string | null;
};

export type BattleProgressView = { mainGun: MainGunView | null; wn8: Wn8Data | null };
