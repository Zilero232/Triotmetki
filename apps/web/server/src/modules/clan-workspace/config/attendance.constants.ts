import type { ClanEventKind } from '../../../../generated';

import { ARENA_BONUS_TYPE } from '../../reference';

export const ATTENDANCE_BONUS_TYPES = {
  stronghold: [ARENA_BONUS_TYPE.strongholdSkirmish, ARENA_BONUS_TYPE.strongholdAdvance],
  clanWars: [ARENA_BONUS_TYPE.globalMap],
  training: [],
  tournament: [],
  other: []
} as const satisfies Record<ClanEventKind, readonly number[]>;
