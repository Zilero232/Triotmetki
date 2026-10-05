import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { HttpClientService, PrismaService } from '../../../../../core';

import { REFERENCE } from '../../config/reference.constants';
import { ExpectedValuesSyncService } from '../expected-values-sync.service';

const xvm = {
  header: { version: '2026-09-23' },
  data: [{ IDNum: 1, expDef: 0.8, expFrag: 1.1, expSpot: 1.2, expDamage: 1500, expWinRate: 52 }]
};

const createSync = (inserted: number) => {
  const prisma = mockDeep<PrismaService>();
  const http = mock<HttpClientService>();

  prisma.wn8ExpectedValue.createMany.mockResolvedValue({ count: inserted });

  return { prisma, http, service: new ExpectedValuesSyncService(prisma, http) };
};

describe('ExpectedValuesSyncService.sync', () => {
  it('adds the table dated by the XVM header without touching earlier dates', async () => {
    const { prisma, http, service } = createSync(1);

    http.getJson.mockResolvedValue(xvm);

    expect(await service.sync()).toEqual({ date: '2026-09-23', vehicles: 1, inserted: 1 });

    expect(prisma.wn8ExpectedValue.createMany.mock.calls[0]?.[0]).toMatchObject({
      skipDuplicates: true,
      data: [{ tankId: 1, source: REFERENCE.wn8Source, expDamage: 1500, expFrags: 1.1, expSpotted: 1.2, expDefense: 0.8, expWinRate: 52 }]
    });

    expect(prisma.wn8ExpectedValue.deleteMany).not.toHaveBeenCalled();
  });

  it('writes nothing when the source is down', async () => {
    const { prisma, http, service } = createSync(0);

    http.getJson.mockRejectedValue(new Error('HTTP 502'));

    await expect(service.sync()).rejects.toThrow();
    expect(prisma.wn8ExpectedValue.createMany).not.toHaveBeenCalled();
  });
});
