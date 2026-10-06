import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { AuthenticatedDevice } from '../../../mod';

import { ReplayStatusReaderService } from '../replay-status-reader.service';

const device: AuthenticatedDevice = {
  id: 'dev',
  userId: 'user',
  accountId: 12_345n,
  name: null,
  secretHash: 'hash',
  modVersion: null,
  gameVersion: null,
  badgeVisible: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-09-01T00:00:00.000Z')
};

const FIRST = '0f8e2d4c-6b1a-4f3e-9d2c-7a5b3c1d9e8f';
const SECOND = '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d';
const FOREIGN = 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f';

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  return { service: new ReplayStatusReaderService(prisma), prisma };
};

describe('ReplayStatusReaderService.forDevice', () => {
  it('scopes the lookup to the device owner and account', async () => {
    const { service, prisma } = createService();

    prisma.replay.findMany.mockResolvedValue([]);

    await service.forDevice({ device, replayIds: [FIRST, FIRST] });

    expect(prisma.replay.findMany.mock.calls[0]?.[0]?.where).toEqual({
      id: { in: [FIRST] },
      uploaderUserId: device.userId,
      OR: [{ deviceId: device.id }, { accountId: device.accountId }]
    });
  });

  it('answers the owned replays in request order and leaves the others out', async () => {
    const { service, prisma } = createService();

    prisma.replay.findMany.mockResolvedValue([
      mock<Replay>({ id: FIRST, status: 'parsing', damageDealt: null, summary: null }),
      mock<Replay>({ id: SECOND, status: 'uploaded', damageDealt: null, summary: null })
    ]);

    const answer = await service.forDevice({ device, replayIds: [SECOND, FOREIGN, FIRST] });

    expect(answer).toEqual({
      account_id: Number(device.accountId),
      replays: [
        { id: SECOND, status: 'uploaded', highlights: null },
        { id: FIRST, status: 'parsing', highlights: null }
      ]
    });
  });
});
