import { afterAll, beforeEach, expect, it } from 'vitest';

import { moscowBucket, moscowDayText, moscowHour, moscowWeekday, percentile, plusHours, replayWithoutModBattle, statSums } from '../sql-expressions';
import { createTestPrisma, describeWithDatabase, truncateTables } from './test-database';

const SEED = {
  accountId: 1_000_000_002n,
  mondayNightUtc: new Date('2026-10-04T22:30:00Z'),
  tankId: 1
} as const;

const delta = ({ battles, wins, damageDealt }: { battles: number; wins: number; damageDealt: number }) => ({
  accountId: SEED.accountId,
  tankId: SEED.tankId,
  mode: 'random' as const,
  cohort: 'average' as const,
  accountWinRate: 50,
  battles,
  wins,
  damageDealt,
  damageBlocked: 0,
  frags: 1,
  spotted: 1,
  xp: 100,
  survived: 0,
  hits: 0,
  shots: 0,
  capturePoints: 0,
  droppedCapturePoints: 0
});

const replay = (arenaUniqueId: bigint) => ({
  storageKey: `replay-${arenaUniqueId}`,
  fileName: `${arenaUniqueId}.mtreplay`,
  fileSize: 1,
  sha256: `sha-${arenaUniqueId}`,
  accountId: SEED.accountId,
  arenaUniqueId,
  playerAccountIds: []
});

describeWithDatabase('sql expressions', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_battle_delta', 'battle', 'replay', 'player'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sums the stat columns into numbers without casts', async () => {
    await prisma.tankBattleDelta.createMany({
      data: [
        { ...delta({ battles: 2, wins: 1, damageDealt: 3000 }), capturedAt: SEED.mondayNightUtc },
        { ...delta({ battles: 3, wins: 2, damageDealt: 4500 }), capturedAt: new Date('2026-10-05T10:00:00Z') }
      ]
    });

    const rows = await prisma.$kysely
      .selectFrom('tank_battle_delta')
      .select('tank_id')
      .select(statSums(['battles', 'wins', 'damage']))
      .groupBy('tank_id')
      .execute();

    expect(rows).toEqual([{ tank_id: SEED.tankId, battles: 5, wins: 3, damage: 7500 }]);
  });

  it('counts into a number', async () => {
    await prisma.player.create({ data: { accountId: SEED.accountId, nickname: 'counted' } });

    const row = await prisma.$kysely
      .selectFrom('player')
      .select((eb) => eb.fn.countAll<number>().as('total'))
      .executeTakeFirstOrThrow();

    expect(row).toEqual({ total: 1 });
  });

  it('reads a UTC instant in Moscow time', async () => {
    await prisma.tankBattleDelta.create({ data: { ...delta({ battles: 1, wins: 1, damageDealt: 1 }), capturedAt: SEED.mondayNightUtc } });

    const row = await prisma.$kysely
      .selectFrom('tank_battle_delta')
      .select([
        moscowDayText('captured_at').as('day'),
        moscowHour('captured_at').as('hour'),
        moscowWeekday({ column: 'captured_at', weekStartsOn: 'monday' }).as('mondayFirst'),
        moscowWeekday({ column: 'captured_at', weekStartsOn: 'sunday' }).as('sundayFirst'),
        moscowBucket({ granularity: 'day', column: 'captured_at' }).as('bucket')
      ])
      .executeTakeFirstOrThrow();

    expect(row).toEqual({ day: '2026-10-05', hour: 1, mondayFirst: 0, sundayFirst: 1, bucket: new Date('2026-10-04T21:00:00Z') });
  });

  it('takes a continuous percentile', async () => {
    await prisma.tankBattleDelta.createMany({
      data: [1, 2, 3, 4].map((damageDealt, index) => ({
        ...delta({ battles: 1, wins: 0, damageDealt }),
        capturedAt: new Date(SEED.mondayNightUtc.getTime() + index)
      }))
    });

    const row = await prisma.$kysely
      .selectFrom('tank_battle_delta')
      .select(percentile({ fraction: 0.5, column: 'damage_dealt' }).as('median'))
      .executeTakeFirstOrThrow();

    expect(row).toEqual({ median: 2.5 });
  });

  it('shifts a timestamp by whole hours', async () => {
    await prisma.tankBattleDelta.create({ data: { ...delta({ battles: 1, wins: 1, damageDealt: 1 }), capturedAt: SEED.mondayNightUtc } });

    const row = await prisma.$kysely
      .selectFrom('tank_battle_delta')
      .select(plusHours({ column: 'captured_at', hours: 72 }).as('shifted'))
      .executeTakeFirstOrThrow();

    expect(row).toEqual({ shifted: new Date('2026-10-07T22:30:00Z') });
  });

  it('keeps only the replays no mod battle already covers', async () => {
    await prisma.player.create({ data: { accountId: SEED.accountId, nickname: 'recorder' } });
    await prisma.replay.createMany({ data: [replay(11n), replay(12n)] });

    await prisma.battle.create({
      data: {
        accountId: SEED.accountId,
        arenaUniqueId: 11n,
        tankId: SEED.tankId,
        arenaId: 'map',
        battleType: 'random',
        result: 'win',
        damageDealt: 0,
        damageAssistedRadio: 0,
        damageAssistedTrack: 0,
        damageAssistedStun: 0,
        damageBlocked: 0,
        damageReceived: 0,
        spotted: 0,
        frags: 0,
        xp: 0,
        survived: true,
        startedAt: SEED.mondayNightUtc
      }
    });

    const rows = await prisma.$kysely.selectFrom('replay').select('arena_unique_id').where(replayWithoutModBattle).execute();

    expect(rows).toEqual([{ arena_unique_id: 12 }]);
  });
});
