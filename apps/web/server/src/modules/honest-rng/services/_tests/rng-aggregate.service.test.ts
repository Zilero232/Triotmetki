import { subHours } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CollectorState } from '../../../../../generated';
import type { RngBattleRow, RngBattlesQueries } from '../../queries/rng-battles.types';

import { moscowCalendarDate } from '../../../../common/lib';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { BATTLE_CORROBORATION } from '../../../mod';
import { HONEST_RNG_AGGREGATE } from '../../config/aggregate.constants';
import { dailyFromTally } from '../../lib/rng-daily/rng-daily';
import { emptyTally, foldBattle } from '../../lib/roll-tally/roll-tally';
import { RngAggregateService } from '../rng-aggregate.service';

const NOW = new Date('2026-09-27T12:00:00Z');
const MARK = { receivedAt: new Date('2026-09-27T10:00:00Z'), id: 'b-5' };

const battle = (id: string, receivedAt: Date): RngBattleRow => ({
  id,
  accountId: 1,
  tankId: 1,
  startedAt: receivedAt,
  receivedAt,
  shots: [{ damage: 400, nominal: 400, shell: 'armor_piercing', outcome: 'damage', distance: 100, fatal: false }],
  shotsFired: 1,
  shotsHit: 1,
  shotsPierced: 1
});

const createService = (stored: CollectorState | null) => {
  const prisma = mockPrismaService();
  const queries = { rngBattles: vi.fn<RngBattlesQueries['rngBattles']>().mockResolvedValue([]) };

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.vehicle.findMany.mockResolvedValue([]);
  prisma.collectorState.findUnique.mockResolvedValue(stored);
  prisma.rngDaily.findMany.mockResolvedValue([]);

  return { prisma, queries, service: new RngAggregateService(prisma, queries) };
};

describe('RngAggregateService.compute', () => {
  it('advances the watermark to the last battle it folded', async () => {
    const { prisma, queries, service } = createService(null);
    const last = new Date('2026-09-27T11:00:00Z');

    queries.rngBattles.mockResolvedValueOnce([battle('b-1', new Date('2026-09-27T09:00:00Z')), battle('b-2', last)]);

    expect(await service.compute(NOW)).toMatchObject({ battles: 2 });
    expect(prisma.collectorState.upsert.mock.calls[0]?.[0].update.value).toEqual({ receivedAt: last.toISOString(), id: 'b-2' });
  });

  it('adds new battles to the stored day instead of replacing it', async () => {
    const { prisma, queries, service } = createService(null);
    const at = new Date('2026-09-27T09:00:00Z');
    const earlier = foldBattle({ tally: emptyTally(), accountId: '2', shots: [], accuracy: null });

    prisma.rngDaily.findMany.mockResolvedValue([
      dailyFromTally({ day: moscowCalendarDate(at), scope: HONEST_RNG_AGGREGATE.scopes.server, tally: earlier })
    ]);

    queries.rngBattles.mockResolvedValueOnce([battle('b-1', at)]);

    await service.compute(NOW);

    const server = prisma.rngDaily.upsert.mock.calls.map(([args]) => args.create).find((row) => row.scope === HONEST_RNG_AGGREGATE.scopes.server);

    expect(server).toMatchObject({ battles: 2, players: [2n, 1n] });
  });
});

describe('RngAggregateService.compute sources', () => {
  it('resumes after the stored watermark and waits for battles to settle', async () => {
    const { queries, service } = createService(
      mock<CollectorState>({ key: HONEST_RNG_AGGREGATE.watermarkKey, value: { receivedAt: MARK.receivedAt.toISOString(), id: MARK.id } })
    );

    await service.compute(NOW);

    expect(queries.rngBattles).toHaveBeenCalledWith(
      expect.objectContaining({ watermark: MARK, until: subHours(NOW, HONEST_RNG_AGGREGATE.settleHours) })
    );
  });

  it('holds the watermark back until the corroboration window has closed', () => {
    expect(HONEST_RNG_AGGREGATE.settleHours).toBeGreaterThan(BATTLE_CORROBORATION.windowHours);
  });
});
