import type { TankChallenges, TankProgressList } from '@otmetki/schemas';

import type { PlayerTank } from '../../../../generated';

export type TankProgressItem = TankProgressList['items'][number];

export type TankProgressRow = Pick<PlayerTank, 'accountId' | 'progressBattles' | 'progressXp' | 'tankId' | 'updatedAt'>;

export type TankChallengeSet = TankChallenges['sets'][number];
