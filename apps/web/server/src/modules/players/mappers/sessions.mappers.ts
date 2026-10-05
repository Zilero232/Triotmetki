import type { SessionListItem } from '@otmetki/schemas';

import type { PlaySession } from '../../../../generated';

import { ratio, toIso, toIsoDate } from '../../../common/lib';
import { statsBlockFromTotals } from '../lib/stats-block/stats-block';

export const toSessionListItem = (session: PlaySession): SessionListItem => ({
  id: session.id,
  kind: session.kind,
  source: session.source,
  isLive: session.kind === 'live' && session.status === 'open',
  day: toIsoDate(session.day),
  startedAt: session.startedAt.toISOString(),
  endedAt: toIso(session.endedAt),
  stats: statsBlockFromTotals({
    battles: session.battles,
    wins: session.wins,
    damageDealt: session.damageDealt,
    frags: session.frags,
    spotted: session.spotted,
    xp: session.xp,
    survived: session.survived,
    avgBlocked: ratio({ value: session.damageBlocked, by: session.battles }),
    avgAssisted: ratio({ value: session.damageAssisted, by: session.battles }),
    wn8: session.wn8,
    broneIndex: session.broneIndex
  })
});
