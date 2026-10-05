import type { StatsBlock } from '@otmetki/schemas';

import type { FromSnapshotInput } from '../players.types';

import { toNumber } from '../../../common/lib';
import { statsBlockFromTotals } from '../lib/stats-block/stats-block';

export const toSnapshotStats = ({ snapshot, rating }: FromSnapshotInput): StatsBlock =>
  statsBlockFromTotals({
    battles: snapshot.battles,
    wins: snapshot.wins,
    damageDealt: toNumber(snapshot.damageDealt),
    frags: snapshot.frags,
    spotted: snapshot.spotted,
    xp: toNumber(snapshot.xp),
    survived: snapshot.survived,
    hits: snapshot.hits,
    shots: snapshot.shots,
    avgBlocked: snapshot.avgDamageBlocked,
    avgAssisted: snapshot.avgDamageAssisted,
    avgTier: rating?.avgTier,
    wn8: rating?.wn8,
    eff: rating?.eff,
    broneIndex: rating?.broneIndex
  });
