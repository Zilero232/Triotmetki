import type { Arena, MapRotationAggregate, QueueTimeAggregate } from '../../../../generated';

type RotationArena = Pick<Arena, 'arenaId' | 'camouflageType' | 'image' | 'name' | 'slug'>;

export type RotationRowInput = {
  row: Pick<MapRotationAggregate, 'arenaId' | 'battles' | 'modBattles' | 'replayBattles' | 'share'>;
  arena: RotationArena | undefined;
};

export type QueueCellSource = Pick<QueueTimeAggregate, 'avgSec' | 'hour' | 'medianSec' | 'p90Sec' | 'samples' | 'tier'>;
