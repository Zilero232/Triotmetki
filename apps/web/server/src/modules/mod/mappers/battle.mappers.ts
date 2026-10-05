import type { ModBattleLoadout } from '@otmetki/schemas';

import { fromUnixTime, secondsToMilliseconds } from 'date-fns';

import type { Prisma } from '../../../../generated';
import type { StoredShot } from '../../analytics';
import type { StoredLoadout } from '../lib/loadout';
import type { BattleDataInput, ModShot, ToPlayerTankMoeInput } from './battle.types';

import { BATTLE, moePercent, platoonSizeOf } from '../lib/battle';

export const toStoredShot = (shot: ModShot): StoredShot => ({
  damage: shot.damage,
  nominal: shot.nominal,
  shell: shot.shell,
  outcome: shot.outcome,
  distance: shot.distance_m,
  fatal: shot.fatal
});

export const toStoredLoadout = (loadout: ModBattleLoadout): StoredLoadout => ({
  optionalDevices: loadout.optional_devices,
  consumables: loadout.consumables,
  directives: loadout.directives,
  shells: loadout.shells.map((shell) => ({ shellId: shell.shell_id, count: shell.count })),
  fieldModifications: loadout.field_modifications,
  crew: loadout.crew.map((member) => ({ role: member.role, skills: member.skills })),
  gameplayId: loadout.gameplay_id
});

export const toPlayerTankMoe = ({ moe, previousMarks }: ToPlayerTankMoeInput) =>
  ({
    marksOnGun: moe.marks_on_gun,
    ...(previousMarks === moe.marks_on_gun ? {} : { marksSource: 'mod' as const }),
    moePercent: moePercent(moe.damage_rating),
    moeMovingDamage: moe.moving_avg_damage,
    moeUpdatedAt: new Date()
  }) satisfies Prisma.PlayerTankUpdateInput;

export const toBattleData = ({ event, accountId, deviceId, sessionId, previousMoePercent }: BattleDataInput): Prisma.BattleUncheckedCreateInput => {
  const { stats, moe } = event;
  const percent = moe ? moePercent(moe.damage_rating) : null;

  return {
    accountId,
    sessionId,
    deviceId,
    arenaUniqueId: BigInt(event.arena_unique_id),
    tankId: event.vehicle.tank_id,
    arenaId: event.map_name ?? String(event.arena_type_id & BATTLE.geometryMask),
    battleType: String(event.bonus_type),
    gameMode: String(event.gui_type),
    result: event.result,
    team: event.team,
    damageDealt: stats.damage_dealt,
    damageAssistedRadio: stats.damage_assisted_radio,
    damageAssistedTrack: stats.damage_assisted_track,
    damageAssistedStun: stats.damage_assisted_stun,
    damageBlocked: stats.damage_blocked,
    damageReceived: 0,
    spotted: stats.spotted,
    frags: stats.frags,
    xp: stats.xp,
    freeXp: stats.free_xp ?? null,
    credits: stats.factual_credits,
    creditsGross: stats.original_credits,
    isPremiumAccount: stats.is_premium,
    repairCost: stats.repair_cost ?? null,
    ammoCost: stats.ammo_cost ?? null,
    consumablesCost: stats.consumables_cost ?? null,
    survived: stats.is_alive,
    lifetimeSec: stats.life_time_s,
    shotsFired: stats.shots,
    shotsHit: stats.direct_enemy_hits,
    shotsPierced: stats.piercing_enemy_hits,
    shots: event.shots && event.shots.length > 0 ? event.shots.map(toStoredShot) : undefined,
    moeMovingAvg: moe?.moving_avg_damage ?? null,
    platoonSize: platoonSizeOf(event.platoon),
    moePercent: percent,
    moePercentDelta: percent !== null && previousMoePercent !== null ? percent - previousMoePercent : null,
    marksOnGun: moe?.marks_on_gun ?? null,
    queueTimeMs: event.queue_time_s === null ? null : Math.round(secondsToMilliseconds(event.queue_time_s)),
    durationSec: event.duration_s,
    loadout: event.loadout ? toStoredLoadout(event.loadout) : undefined,
    achievements: event.achievements ?? [],
    startedAt: fromUnixTime(event.arena_created_at)
  };
};
