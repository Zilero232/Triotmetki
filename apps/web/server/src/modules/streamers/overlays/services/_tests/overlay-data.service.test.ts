import type { Cache } from 'cache-manager';

import { overlayConfigSchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, Overlay, PlaySession, StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { EntitlementsService } from '../../../../billing';
import type { CosmeticsReaderService } from '../../../../progression';
import type { VehicleCatalogService } from '../../../../reference';

import { OverlayDataService } from '../overlay-data.service';
import { OverlayStatsReaderService } from '../overlay-stats-reader.service';

const config = overlayConfigSchema.parse({ metrics: ['broneIndex', 'wn8'] });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const cache = mock<Cache>();
  const entitlements = mock<EntitlementsService>();
  const cosmetics = mock<CosmeticsReaderService>();

  cosmetics.effectiveOverlayTheme.mockImplementation(async ({ theme }) => theme);
  prisma.challenge.findFirst.mockResolvedValue(null);
  prisma.battle.findMany.mockResolvedValue([]);

  return {
    service: new OverlayDataService(prisma, new OverlayStatsReaderService(prisma, catalog), entitlements, cosmetics, cache),
    prisma,
    entitlements
  };
};

describe('OverlayDataService.preview', () => {
  it('renders an unsaved config and kind without reading any stored overlay', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(null);

    const data = await service.preview({ userId: 'u1', kind: 'wn8', config });

    expect(data).toMatchObject({ kind: 'wn8', name: '', config, player: null, session: null });
    expect(prisma.overlay.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to the streamer profile's account when the draft names none", async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ accountId: 7n }));
    prisma.playSession.findFirst.mockResolvedValue(null);
    prisma.accountRating.findUnique.mockResolvedValue(null);
    prisma.player.findUnique.mockResolvedValue(null);

    await service.preview({ userId: 'u1', kind: 'session', config });

    expect(prisma.accountRating.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId_period: { accountId: 7n, period: 'overall' } } })
    );
  });

  it('carries the Bronya index of the session and of the whole account', async () => {
    const { service, prisma } = createService();
    const sessionIndex = 1234;
    const overallIndex = 987;

    prisma.player.findUnique.mockResolvedValue(null);
    prisma.accountRating.findUnique.mockResolvedValue(mock<AccountRating>({ battles: 10, winRate: 50, wn8: 1500, broneIndex: overallIndex }));

    prisma.playSession.findFirst.mockResolvedValue(
      mock<PlaySession>({ id: 's1', battles: 2, wins: 1, damageDealt: 3000, frags: 1, wn8: 1800, broneIndex: sessionIndex })
    );

    const data = await service.preview({ userId: 'u1', accountId: 7, kind: 'session', config });

    expect(data.session?.broneIndex).toBe(sessionIndex);
    expect(data.overall?.broneIndex).toBe(overallIndex);
  });
});

describe('OverlayDataService.compute', () => {
  const overlay: Overlay = {
    id: 'o3',
    userId: 'u1',
    accountId: 7n,
    name: 'WN8',
    kind: 'wn8',
    theme: 'steel',
    config,
    publicKey: 'key',
    createdAt: new Date('2026-09-26T10:00:00Z'),
    updatedAt: new Date('2026-09-26T10:00:00Z')
  };

  it('shows a neutral paused frame for an overlay over the free limit after Plus ends', async () => {
    const { service, prisma, entitlements } = createService();

    entitlements.isPlus.mockResolvedValue(false);
    prisma.overlay.count.mockResolvedValue(2);

    const data = await service.compute(overlay);

    expect(data).toMatchObject({ isPaused: true, player: null, session: null, config });
    expect(prisma.accountRating.findUnique).not.toHaveBeenCalled();
  });

  it('keeps every overlay of a subscriber running', async () => {
    const { service, prisma, entitlements } = createService();

    entitlements.isPlus.mockResolvedValue(true);
    prisma.playSession.findFirst.mockResolvedValue(null);
    prisma.accountRating.findUnique.mockResolvedValue(null);
    prisma.player.findUnique.mockResolvedValue(null);

    expect((await service.compute(overlay)).isPaused).toBe(false);
    expect(prisma.overlay.count).not.toHaveBeenCalled();
  });
});
