import { BRONYA_INDEX } from '@otmetki/ratings';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { TankPercentile } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { bronyaReferencePayload } from '../../lib/bronya-reference/bronya-reference';
import { BronyaReferencesService } from '../bronya-references.service';

const ramp = (scale: number) => BRONYA_INDEX.quantileLevels.map((level) => level * scale);

const PAYLOAD = bronyaReferencePayload({
  players: 100,
  components: { damage: ramp(3000), winRate: ramp(70), frags: ramp(2), spotted: ramp(3), defence: ramp(1) }
});

const DATE = new Date('2026-09-20T00:00:00.000Z');

const createService = (date: Date | null) => {
  const prisma = mockDeep<PrismaService>();

  vi.mocked(prisma.tankPercentile.aggregate).mockResolvedValue({ _max: { date }, _min: {}, _avg: {}, _sum: {}, _count: {} });

  return { service: new BronyaReferencesService(prisma), prisma };
};

describe('BronyaReferencesService.all', () => {
  it('returns no references before the first computation', async () => {
    const { service, prisma } = createService(null);

    expect((await service.all()).size).toBe(0);
    expect(prisma.tankPercentile.findMany).not.toHaveBeenCalled();
  });

  it('keeps valid references of the latest date and skips malformed ones', async () => {
    const { service, prisma } = createService(DATE);

    prisma.tankPercentile.findMany.mockResolvedValue([
      mock<TankPercentile>({ tankId: 1, percentiles: PAYLOAD }),
      mock<TankPercentile>({ tankId: 2, percentiles: { broken: true } })
    ]);

    const references = await service.all();

    expect([...references.keys()]).toEqual([1]);
    expect(prisma.tankPercentile.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ date: DATE }) }));
  });
});
