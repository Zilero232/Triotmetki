import { subHours } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { battleRow, STAT_SEED, tankDeltaRow } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { HONEST_RNG_AGGREGATE, RNG_PERIODS } from '../../config/aggregate.constants';
import { RngAggregateService } from '../rng-aggregate.service';

const NOW = new Date('2026-09-27T12:00:00.000Z');
const STARTED_AT = subHours(NOW, 100);
const SETTLED_AT = subHours(NOW, HONEST_RNG_AGGREGATE.settleHours + 1);
const SHOTS = [{ damage: 400, nominal: 400, shell: 'armor_piercing', outcome: 'damage', distance: 100, fatal: false }];
const TIER = 10;

const battle = (id: string, receivedAt: Date) =>
  battleRow({
    id,
    arenaUniqueId: BigInt(id.replace(/\D/g, '')),
    startedAt: STARTED_AT,
    receivedAt,
    shots: SHOTS,
    shotsFired: 1,
    shotsHit: 1,
    shotsPierced: 1
  });

describeWithDatabase('RngAggregateService.compute', () => {
  const prisma = createTestPrisma();
  const service = new RngAggregateService(prisma);

  const daily = async () =>
    (await prisma.rngDaily.findMany({ orderBy: { scope: 'asc' } })).map(({ scope, battles, shots }) => ({ scope, battles, shots }));

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'tank_battle_delta', 'player', 'vehicle', 'rng_daily', 'rng_aggregate', 'collector_state'] });
    await prisma.player.create({ data: { accountId: STAT_SEED.accountId, nickname: 'Shooter' } });

    await prisma.vehicle.create({
      data: { tankId: STAT_SEED.tankId, name: 'Heavy X', shortName: 'HX', slug: 'heavy-x', nation: 'ussr', type: 'heavyTank', tier: TIER }
    });

    await prisma.tankBattleDelta.create({ data: tankDeltaRow({ capturedAt: subHours(STARTED_AT, -1) }) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('folds only battles whose corroboration window has closed', async () => {
    await prisma.battle.createMany({ data: [battle('b-1', SETTLED_AT), battle('b-2', subHours(NOW, 1))] });

    const result = await service.compute(NOW);

    expect(result).toEqual({ battles: 1, rows: 3 * RNG_PERIODS.length });
  });

  it('writes one daily row per scope of the folded battle', async () => {
    await prisma.battle.createMany({ data: [battle('b-1', SETTLED_AT)] });

    await service.compute(NOW);

    expect(await daily()).toEqual([
      { scope: HONEST_RNG_AGGREGATE.scopes.server, battles: 1, shots: 1 },
      { scope: `${HONEST_RNG_AGGREGATE.scopes.shell}:armor_piercing`, battles: 1, shots: 1 },
      { scope: `${HONEST_RNG_AGGREGATE.scopes.tier}:${TIER}`, battles: 1, shots: 1 }
    ]);
  });

  it('stores the last folded battle as the watermark', async () => {
    await prisma.battle.createMany({ data: [battle('b-1', subHours(SETTLED_AT, 1)), battle('b-2', SETTLED_AT)] });

    await service.compute(NOW);

    const state = await prisma.collectorState.findUnique({ where: { key: HONEST_RNG_AGGREGATE.watermarkKey } });

    expect(state?.value).toEqual({ receivedAt: SETTLED_AT.toISOString(), id: 'b-2' });
  });

  it('resumes after the stored watermark and adds to the stored day', async () => {
    await prisma.battle.createMany({ data: [battle('b-1', subHours(SETTLED_AT, 1))] });
    await service.compute(NOW);
    await prisma.battle.createMany({ data: [battle('b-2', SETTLED_AT)] });

    const result = await service.compute(NOW);

    expect(result.battles).toBe(1);
    expect((await daily()).find(({ scope }) => scope === HONEST_RNG_AGGREGATE.scopes.server)).toEqual({ scope: 'server', battles: 2, shots: 2 });
  });

  it('skips battles nothing corroborates', async () => {
    await prisma.battle.createMany({ data: [{ ...battle('b-1', SETTLED_AT), damageDealt: 1_000_000 }] });

    expect(await service.compute(NOW)).toEqual({ battles: 0, rows: 0 });
  });
});
