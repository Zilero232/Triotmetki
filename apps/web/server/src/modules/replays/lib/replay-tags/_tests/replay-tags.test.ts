import type { ReplayTag } from '@otmetki/schemas';

import { REPLAY_TAG_RULES } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { ReplayPlayer, ReplaySummary } from '../../../../../lib/replay';

import { REPLAY_TAGGING } from '../../../config/tagging.constants';
import { replayTagColumns, replayTags } from '../replay-tags';

type Fighter = {
  team: number;
  diedAt?: number | null;
  damage?: number;
  frags?: number;
  capturePoints?: number;
  maxHealth?: number | null;
  isRecorder?: boolean;
};

const BATTLE_SECONDS = 600;
const TEAM_SIZE = 15;

const player = (
  { team, diedAt = null, damage = 500, frags = 0, capturePoints = 0, maxHealth = 1_000, isRecorder = false }: Fighter,
  index: number
): ReplayPlayer => ({
  vehicleId: index + 1,
  accountId: index + 100,
  name: `player${index}`,
  clanTag: isRecorder ? 'TAG' : null,
  team,
  vehicleType: null,
  tankId: 1,
  maxHealth,
  isRecorder,
  result: {
    damageDealt: damage,
    assistRadio: 0,
    assistTrack: 0,
    assistStun: 0,
    blocked: 1_234.4,
    damageReceived: 0,
    spotted: 0,
    frags,
    teamKills: 0,
    xp: 0,
    credits: 0,
    shots: 0,
    hits: 0,
    penetrations: 0,
    capturePoints,
    defencePoints: 0,
    lifeTimeSeconds: diedAt ?? BATTLE_SECONDS,
    health: null,
    survived: diedAt === null,
    killerVehicleId: null
  }
});

const summary = ({
  fighters,
  outcome = 'win',
  finishReason = 1
}: {
  fighters: Fighter[];
  outcome?: ReplaySummary['outcome'];
  finishReason?: number;
}): ReplaySummary => ({
  game: 'lesta',
  clientVersion: { xml: null, exe: null, numbers: null, label: null },
  region: null,
  server: null,
  map: { id: null, name: null, arenaTypeId: null },
  mode: null,
  battleType: 1,
  dateTime: null,
  startedAt: null,
  arenaCreatedAt: null,
  durationSeconds: BATTLE_SECONDS,
  winnerTeam: 1,
  finishReason,
  outcome,
  arenaUniqueId: null,
  isComplete: true,
  hasMods: null,
  recorder: { accountId: 100, name: 'player0', vehicleId: 1, vehicleType: null, team: 1, markOfMastery: 4 },
  players: fighters.map(player)
});

const team = ({ side, count, fighter = {} }: { side: number; count: number; fighter?: Omit<Fighter, 'team'> }): Fighter[] =>
  Array.from({ length: count }, () => ({ team: side, ...fighter }));

const RECORDER: Fighter = { team: 1, isRecorder: true };

const has = (tags: ReplayTag[], tag: ReplayTag) => tags.includes(tag);

describe('replayTags', () => {
  it('tags nothing on a loss', () => {
    const fighters = [{ ...RECORDER, frags: 10, damage: 20_000 }, ...team({ side: 1, count: TEAM_SIZE - 1 }), ...team({ side: 2, count: TEAM_SIZE })];

    expect(replayTags(summary({ fighters, outcome: 'loss' }))).toEqual([]);
  });

  it('tags nothing when a player has no battle result', () => {
    const tagged = summary({ fighters: [{ ...RECORDER, frags: 10 }, ...team({ side: 2, count: 1, fighter: { diedAt: 10 } })] });

    expect(replayTags({ ...tagged, players: tagged.players.map((entry, index) => (index === 1 ? { ...entry, result: null } : entry)) })).toEqual([]);
  });

  it('tags a Kolobanov when the last ally fell with enough enemies still alive', () => {
    const { minEnemiesAlive } = REPLAY_TAG_RULES.kolobanov;
    const atLastAllyDeath = (alive: number) => [
      RECORDER,
      ...team({ side: 1, count: TEAM_SIZE - 1, fighter: { diedAt: 100 } }),
      ...team({ side: 2, count: alive, fighter: { diedAt: 200 } }),
      ...team({ side: 2, count: TEAM_SIZE - alive, fighter: { diedAt: 50 } })
    ];

    expect(has(replayTags(summary({ fighters: atLastAllyDeath(minEnemiesAlive) })), 'kolobanov')).toBe(true);
    expect(has(replayTags(summary({ fighters: atLastAllyDeath(minEnemiesAlive - 1) })), 'kolobanov')).toBe(false);
  });

  it('does not count an enemy dying in the same second as the last ally as alive', () => {
    const fighters = [
      RECORDER,
      ...team({ side: 1, count: TEAM_SIZE - 1, fighter: { diedAt: 100 } }),
      ...team({ side: 2, count: REPLAY_TAG_RULES.kolobanov.minEnemiesAlive, fighter: { diedAt: 100 } }),
      ...team({ side: 2, count: TEAM_SIZE - REPLAY_TAG_RULES.kolobanov.minEnemiesAlive, fighter: { diedAt: 50 } })
    ];

    expect(has(replayTags(summary({ fighters })), 'kolobanov')).toBe(false);
  });

  it('tags a comeback after trailing by the minimum deficit, not by one less', () => {
    const { minDeficit } = REPLAY_TAG_RULES.comeback;
    const trailingBy = (deficit: number) => [
      RECORDER,
      ...team({ side: 1, count: deficit, fighter: { diedAt: 60 } }),
      ...team({ side: 1, count: TEAM_SIZE - 1 - deficit }),
      ...team({ side: 2, count: TEAM_SIZE, fighter: { diedAt: 300 } })
    ];

    expect(has(replayTags(summary({ fighters: trailingBy(minDeficit) })), 'comeback')).toBe(true);
    expect(has(replayTags(summary({ fighters: trailingBy(minDeficit - 1) })), 'comeback')).toBe(false);
  });

  it('tags a raider only for a win by capture with enough of the recorder capture points', () => {
    const { minCapturePoints } = REPLAY_TAG_RULES.raider;
    const fighters = (capturePoints: number) => [{ ...RECORDER, capturePoints }, ...team({ side: 1, count: 1 }), ...team({ side: 2, count: 2 })];

    expect(has(replayTags(summary({ fighters: fighters(minCapturePoints), finishReason: REPLAY_TAGGING.baseCaptureFinishReason })), 'raider')).toBe(
      true
    );

    expect(
      has(replayTags(summary({ fighters: fighters(minCapturePoints - 1), finishReason: REPLAY_TAGGING.baseCaptureFinishReason })), 'raider')
    ).toBe(false);

    expect(has(replayTags(summary({ fighters: fighters(minCapturePoints) })), 'raider')).toBe(false);
  });

  it('tags a high caliber for the most damage that reaches the share of enemy health', () => {
    const enemyHealth = TEAM_SIZE * 1_000;
    const needed = Math.ceil(REPLAY_TAG_RULES.highCaliber.minShareOfEnemyHealth * enemyHealth);
    const fighters = (damage: number) => [
      { ...RECORDER, damage },
      ...team({ side: 1, count: TEAM_SIZE - 1 }),
      ...team({ side: 2, count: TEAM_SIZE })
    ];

    expect(has(replayTags(summary({ fighters: fighters(needed) })), 'highCaliber')).toBe(true);
    expect(has(replayTags(summary({ fighters: fighters(needed - 1) })), 'highCaliber')).toBe(false);
  });

  it('refuses a high caliber shared with another player or with unknown enemy health', () => {
    const tie = [{ ...RECORDER, damage: 9_000 }, ...team({ side: 2, count: TEAM_SIZE - 1 }), { team: 2, damage: 9_000 }];
    const unknownHealth = [{ ...RECORDER, damage: 9_000 }, ...team({ side: 2, count: TEAM_SIZE, fighter: { maxHealth: null } })];

    expect(has(replayTags(summary({ fighters: tie })), 'highCaliber')).toBe(false);
    expect(has(replayTags(summary({ fighters: unknownHealth })), 'highCaliber')).toBe(false);
  });

  it('tags a warrior for the minimum frags when no ally destroyed more', () => {
    const { minFrags } = REPLAY_TAG_RULES.warrior;
    const fighters = (frags: number, allyFrags: number) => [
      { ...RECORDER, frags },
      { team: 1, frags: allyFrags },
      ...team({ side: 2, count: TEAM_SIZE })
    ];

    expect(has(replayTags(summary({ fighters: fighters(minFrags, minFrags) })), 'warrior')).toBe(true);
    expect(has(replayTags(summary({ fighters: fighters(minFrags - 1, 0) })), 'warrior')).toBe(false);
    expect(has(replayTags(summary({ fighters: fighters(minFrags, minFrags + 1) })), 'warrior')).toBe(false);
  });
});

describe('replayTagColumns', () => {
  it('stores the recorder clan, rounded block, mastery and the rules version', () => {
    const columns = replayTagColumns(summary({ fighters: [RECORDER, ...team({ side: 2, count: 1 })], outcome: 'loss' }));

    expect(columns).toEqual({ tags: [], clanTag: 'TAG', damageBlocked: 1_234, markOfMastery: 4, tagsVersion: REPLAY_TAGGING.version });
  });
});
