import type { StoredPlayer } from '../lib/poll-pipeline/poll-pipeline.types';
import type { StoredPlayerRow } from '../selects/players.selects';

export const toStoredPlayer = (player: StoredPlayerRow): StoredPlayer => ({
  accountId: Number(player.accountId),
  clanId: player.clanId === null ? null : Number(player.clanId),
  lastBattleAt: player.lastBattleAt,
  lastPolledAt: player.lastPolledAt,
  trackingTier: player.trackingTier
});
