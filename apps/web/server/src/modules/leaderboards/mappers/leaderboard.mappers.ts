import type { LeaderboardEntry } from '@otmetki/schemas';

import type { ToLeaderboardEntryInput } from './leaderboard.types';

import { ratingValue } from '../../../common/lib';

export const toLeaderboardEntry = ({ row, rank, scale }: ToLeaderboardEntryInput): LeaderboardEntry => ({
  rank,
  accountId: row.accountId,
  clanId: row.clanId,
  name: row.name,
  clanTag: row.clanTag,
  color: row.color,
  value: row.value ?? 0,
  tier: scale && scale !== 'avgDamage' ? ratingValue({ kind: scale, value: row.value }).tier : null,
  battles: Math.max(0, Math.round(row.battles)),
  delta: row.delta
});
