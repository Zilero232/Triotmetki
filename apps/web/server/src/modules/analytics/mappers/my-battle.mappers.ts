import type { MyBattle } from '@otmetki/schemas';

import type { MyBattleInput } from './my-battle.types';

import { assistedOf } from '../lib/battle-review/battle-review';

export const toMyBattle = ({ battle, vehicle, mapName }: MyBattleInput): MyBattle => ({
  id: battle.id,
  startedAt: battle.startedAt.toISOString(),
  tankId: battle.tankId,
  vehicle,
  arenaId: battle.arenaId,
  mapName,
  battleType: battle.battleType,
  result: battle.result,
  team: battle.team,
  damageDealt: battle.damageDealt,
  damageAssisted: assistedOf(battle),
  damageBlocked: battle.damageBlocked,
  frags: battle.frags,
  spotted: battle.spotted,
  xp: battle.xp,
  credits: battle.credits,
  survived: battle.survived,
  lifetimeSec: battle.lifetimeSec,
  durationSec: battle.durationSec,
  moePercent: battle.moePercent,
  moePercentDelta: battle.moePercentDelta,
  platoonSize: battle.platoonSize
});
