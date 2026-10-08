import { groupDigits } from '@/shared/lib/format-number';

import type { BattleProgressData, MainGunData } from '../../model/schemas';
import type { BattleProgressView, MainGunView } from './battle-progress-view.types';

import { BATTLE_PROGRESS } from '../../config';

const tallyText = (data: MainGunData): string | null => {
  if (data.progress === null) {
    return null;
  }

  return `${groupDigits(data.damage)}${BATTLE_PROGRESS.separator}${groupDigits(data.need)}`;
};

const mainGunView = (data: MainGunData): MainGunView => {
  const isReached = data.status === 'reached';

  return {
    title: data.title,
    icon: data.icon,
    reachedIcon: data.reached_icon,
    isReached,
    tone: BATTLE_PROGRESS.tones[data.status],
    headline: isReached ? data.reached_text : groupDigits(data.left),
    caption: isReached ? null : data.left_caption,
    tally: tallyText(data),
    fill: data.progress,
    detail: data.detail
  };
};

export const battleProgressView = (data: BattleProgressData): BattleProgressView => ({
  mainGun: data.main_gun === null ? null : mainGunView(data.main_gun),
  wn8: data.wn8
});
