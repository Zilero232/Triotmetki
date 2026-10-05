import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Arena } from '../../../../../generated';
import type { ReferenceRow } from '../../mappers';
import type { AnalyticsQueries } from '../../providers/analytics-queries.provider.types';

import { AppForbiddenException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { VehicleCatalogService } from '../../../reference';
import { UsageMeterService } from '../../../usage';
import { BATTLE_REVIEW } from '../../config';
import { BattleReviewReaderService } from '../battle-review-reader.service';
import { OwnAccountService } from '../own-account.service';
import { battleRow, catalogOf, vehicle } from './analytics.fixtures';

const tank = vehicle({ tankId: 1 });

const referenceRow = (battles: number): ReferenceRow => ({
  battles,
  wins: battles,
  damage: battles * 4_000,
  assisted: 0,
  spotted: 0,
  frags: battles,
  blocked: 0
});

const setup = () => {
  const prisma = mockPrismaService();
  const queries = mock<AnalyticsQueries>();
  const catalog = mock<VehicleCatalogService>();
  const accounts = mock<OwnAccountService>();
  const usage = mock<UsageMeterService>();

  accounts.resolve.mockResolvedValue(7n);
  accounts.accountIds.mockResolvedValue([7n]);
  catalog.all.mockResolvedValue(catalogOf(tank));
  prisma.arena.findMany.mockResolvedValue([Object.assign(mock<Arena>(), { arenaId: 'himmelsdorf', name: 'Himmelsdorf' })]);
  prisma.battle.findMany.mockResolvedValue([]);
  prisma.battle.count.mockResolvedValue(0);
  queries.tankReference.mockResolvedValue(referenceRow(0));

  return { prisma, queries, usage, service: new BattleReviewReaderService(prisma, catalog, accounts, usage, queries) };
};

describe('BattleReviewReaderService.list', () => {
  it('pages battles with vehicle and map names, leaving unknown ones empty', async () => {
    const { prisma, service } = setup();

    prisma.battle.findMany.mockResolvedValue([battleRow({ id: 'a' }), battleRow({ id: 'b', tankId: 999, arenaId: 'unknown' })]);
    prisma.battle.count.mockResolvedValue(12);

    const page = await service.list({ userId: 'u', limit: 2, offset: 4 });

    expect(page).toMatchObject({ total: 12, limit: 2, offset: 4 });

    expect(page.items.map((item) => [item.id, item.vehicle?.tankId ?? null, item.mapName])).toEqual([
      ['a', tank.tankId, 'Himmelsdorf'],
      ['b', null, null]
    ]);
  });

  it('filters by tank only when one is given', async () => {
    const { prisma, service } = setup();

    await service.list({ userId: 'u', limit: 10, offset: 0 });
    await service.list({ userId: 'u', limit: 10, offset: 0, tankId: tank.tankId });

    const [all, filtered] = prisma.battle.count.mock.calls.map(([args]) => args?.where);

    expect(all).not.toHaveProperty('tankId');
    expect(filtered).toMatchObject({ tankId: tank.tankId });
  });
});

describe('BattleReviewReaderService.detail', () => {
  it('returns an owned battle', async () => {
    const { prisma, service } = setup();

    prisma.battle.findFirst.mockResolvedValue(battleRow({ id: 'a' }));

    expect(await service.detail({ userId: 'u', id: 'a' })).toMatchObject({ id: 'a', mapName: 'Himmelsdorf' });
  });

  it('throws not found for a battle outside the user accounts', async () => {
    const { prisma, service } = setup();

    prisma.battle.findFirst.mockResolvedValue(null);

    await expect(service.detail({ userId: 'u', id: 'foreign' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('BattleReviewReaderService.analysis', () => {
  it('has no reference below the minimum number of earlier battles', async () => {
    const { prisma, queries, service } = setup();

    prisma.battle.findFirst.mockResolvedValue(battleRow());
    queries.tankReference.mockResolvedValue(referenceRow(BATTLE_REVIEW.minReferenceBattles - 1));

    expect((await service.analysis({ userId: 'u', id: 'b1' })).reference).toBeNull();
  });

  it('compares against earlier battles once the minimum is reached', async () => {
    const { prisma, queries, service } = setup();

    prisma.battle.findFirst.mockResolvedValue(battleRow({ damageDealt: 100 }));
    queries.tankReference.mockResolvedValue(referenceRow(BATTLE_REVIEW.minReferenceBattles));

    const analysis = await service.analysis({ userId: 'u', id: 'b1' });

    expect(analysis.reference?.battles).toBe(BATTLE_REVIEW.minReferenceBattles);
    expect(analysis.mistakes.map((mistake) => mistake.code)).toContain('lowDamage');
  });

  it('extracts damage rolls from the stored shots', async () => {
    const { prisma, service } = setup();
    const shot = { damage: 400, nominal: 390, shell: 'armor_piercing', outcome: 'damage', distance: 100, fatal: false };

    prisma.battle.findFirst.mockResolvedValue(battleRow({ shots: [shot, { ...shot, outcome: 'miss' }] }));

    const analysis = await service.analysis({ userId: 'u', id: 'b1' });

    expect(analysis.rolls).toHaveLength(1);
    expect(analysis.rolls[0]?.ratio).toBeCloseTo(shot.damage / shot.nominal);
  });

  it('throws not found for a foreign battle without spending an analysis', async () => {
    const { prisma, usage, service } = setup();

    prisma.battle.findFirst.mockResolvedValue(null);

    await expect(service.analysis({ userId: 'u', id: 'x' })).rejects.toMatchObject({ status: 404 });
    expect(usage.consume).not.toHaveBeenCalled();
  });

  it('spends one analysis of the monthly allowance per battle', async () => {
    const { prisma, usage, service } = setup();

    prisma.battle.findFirst.mockResolvedValue(battleRow());

    await service.analysis({ userId: 'u', id: 'b1' });

    expect(usage.consume).toHaveBeenCalledWith(
      expect.objectContaining({ meter: BATTLE_REVIEW.meter, subject: 'b1', actor: expect.objectContaining({ userId: 'u' }) })
    );
  });

  it('withholds the analysis once the allowance is used up', async () => {
    const { prisma, usage, service } = setup();

    prisma.battle.findFirst.mockResolvedValue(battleRow());
    usage.consume.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'used up', { feature: 'battleAnalysis' }));

    await expect(service.analysis({ userId: 'u', id: 'b1' })).rejects.toBeInstanceOf(AppForbiddenException);
  });
});
