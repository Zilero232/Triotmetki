import type { BestBattle, BestBattlesFacets } from '../best-battles.types';
import type { BestBattleMedal, ToArenaInput, ToBestBattleInput, ToFacetsInput, ToMedalInput } from './best-battles.types';

const count = (value: number | null): number | null => (value === null ? null : Math.max(0, Math.round(value)));

const toMedal = ({ name, medals }: ToMedalInput): BestBattleMedal => medals.get(name) ?? { name, title: name, image: null };

const toArena = ({ arenaId, fallback, arenas }: ToArenaInput): BestBattle['arena'] =>
  arenaId === null ? null : { arenaId, name: arenas.get(arenaId) ?? fallback ?? arenaId };

export const toBestBattle = ({ row, vehicles, arenas, medals }: ToBestBattleInput): BestBattle | null => {
  const vehicle = vehicles.get(row.tank_id);

  if (!vehicle) {
    return null;
  }

  return {
    key: row.key,
    rank: row.rank,
    source: row.source,
    accountId: row.account_id,
    nickname: row.nickname ?? String(row.account_id),
    vehicle,
    arena: toArena({ arenaId: row.arena_id, fallback: row.map_name, arenas }),
    result: row.result,
    damage: count(row.damage),
    assisted: count(row.assisted),
    spotted: count(row.spotted),
    frags: count(row.frags),
    xp: count(row.xp),
    blocked: count(row.blocked),
    medals: row.medals.map((name) => toMedal({ name, medals })),
    playedAt: row.played_at.toISOString(),
    replayId: row.replay_id
  };
};

export const toFacets = ({ counts, lookups: { vehicles, arenas, medals }, period, since, now }: ToFacetsInput): BestBattlesFacets => ({
  period,
  since: since.toISOString(),
  battles: counts.battles ?? 0,
  topDamage: counts.top_damage ?? null,
  medals: counts.medals.map((row) => ({ ...toMedal({ name: row.key, medals }), battles: row.battles })),
  tanks: counts.tanks.flatMap((row) => {
    const vehicle = vehicles.get(row.tank_id);

    return vehicle ? [{ vehicle, battles: row.battles }] : [];
  }),
  arenas: counts.arenas.flatMap((row) => {
    const arena = toArena({ arenaId: row.arena_id, fallback: null, arenas });

    return arena ? [{ ...arena, battles: row.battles }] : [];
  }),
  computedAt: now.toISOString()
});
