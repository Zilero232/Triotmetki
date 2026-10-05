import { unique } from 'remeda';

import type { ReplayMedalsInput } from './replay-medals.types';

import { REPLAY_MEDALS } from '../../config/parse.constants';

export const replayMedals = ({ markOfMastery, battleAchievements }: ReplayMedalsInput): string[] => {
  const mastery = REPLAY_MEDALS.masteryBadges.find((badge) => badge.level === markOfMastery)?.name;

  return unique([...(mastery ? [mastery] : []), ...battleAchievements]);
};
