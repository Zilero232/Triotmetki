import { clamp } from 'remeda';

import type { SessionCardRow } from '../selects/session-share.selects';
import type { SessionCardNotification } from './session-card.types';

import { toNumber, winRateShare } from '../../../common/lib';

export const toSessionCard = (row: SessionCardRow): SessionCardNotification | null => {
  const winRate = winRateShare({ wins: row.wins, battles: row.battles });

  if (winRate === null) {
    return null;
  }

  return {
    event: 'sessionFinished',
    accountId: toNumber(row.accountId),
    nickname: row.player.nickname,
    sessionId: row.id,
    battles: row.battles,
    winRate: clamp(winRate, { min: 0, max: 1 }),
    avgDamage: Math.max(0, row.damageDealt) / row.battles,
    wn8: row.wn8
  };
};
