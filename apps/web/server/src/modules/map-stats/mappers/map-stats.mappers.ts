import type { MapRotationRow, QueueCell } from '../map-stats.types';
import type { QueueCellSource, RotationRowInput } from './map-stats.types';

export const toQueueCell = (row: QueueCellSource): QueueCell => ({
  tier: row.tier,
  hour: row.hour,
  samples: row.samples,
  avgSec: row.avgSec,
  medianSec: row.medianSec,
  p90Sec: row.p90Sec
});

export const toMapRotationRow = ({ row, arena }: RotationRowInput): MapRotationRow => ({
  arenaId: row.arenaId,
  name: arena?.name ?? row.arenaId,
  slug: arena?.slug ?? null,
  image: arena?.image ?? null,
  camouflageType: arena?.camouflageType ?? null,
  battles: row.battles,
  share: row.share,
  modBattles: row.modBattles,
  replayBattles: row.replayBattles
});
