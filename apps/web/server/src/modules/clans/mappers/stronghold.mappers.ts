import type { ClanStronghold, StrongholdBuilding } from '@otmetki/schemas';

import { sumBy } from 'remeda';

import type { RawBuilding } from '../lib/stronghold-stats/stronghold-stats.types';
import type { ToStrongholdInput } from './stronghold.types';

import { percentOf, toIso } from '../../../common/lib';
import { rawStrongholdSchema } from '../dto/stronghold.schemas';
import { readBuildings, skirmishTiers, strongholdCount } from '../lib/stronghold-stats/stronghold-stats';

const toBuilding = (raw: RawBuilding): StrongholdBuilding => ({
  type: raw.building_type ?? raw.type ?? 'unknown',
  title: raw.building_title ?? raw.title ?? null,
  level: strongholdCount(raw.level),
  position: raw.position === null || raw.position === undefined ? null : Math.round(raw.position),
  direction: raw.direction_name ?? raw.direction ?? null,
  arenaId: raw.arena_id === null || raw.arena_id === undefined ? null : String(raw.arena_id),
  reserve: raw.reserve_title ?? raw.reserve_type ?? null
});

export const toStronghold = ({ clanId, level, stats, buildings, updatedAt, elo, provinces }: ToStrongholdInput): ClanStronghold => {
  const raw = rawStrongholdSchema.safeParse(stats);
  const info = raw.success ? raw.data : null;
  const storedBuildings = readBuildings(buildings);
  const skirmishes = skirmishTiers(info?.skirmish_statistics);
  const battles = sumBy(skirmishes, (tier) => tier.battles);
  const wins = sumBy(skirmishes, (tier) => tier.wins);

  return {
    clanId,
    level,
    commandCenterArenaId:
      info?.command_center_arena_id === null || info?.command_center_arena_id === undefined ? null : String(info.command_center_arena_id),
    totalResources: strongholdCount(info?.total_resource_amount),
    buildingSlots: strongholdCount(info?.building_slots),
    buildings: (storedBuildings.length > 0 ? storedBuildings : readBuildings(info?.buildings)).map(toBuilding),
    skirmishes,
    battles,
    winRate: percentOf({ value: wins, by: battles }),
    globalMap: { provincesCount: provinces.length, ...elo, provinces },
    updatedAt: toIso(updatedAt)
  };
};
