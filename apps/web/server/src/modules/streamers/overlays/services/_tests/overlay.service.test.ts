import { overlayConfigSchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../../config';
import type { EntitlementsService } from '../../../../billing';
import type { CosmeticsReaderService } from '../../../../progression';
import type { OverlayDataService } from '../overlay-data.service';

import { AppForbiddenException } from '../../../../../common/exceptions';
import { mockPrismaService } from '../../../../../core/prisma/_tests/prisma-mock';
import { OverlayService } from '../overlay.service';

const config = overlayConfigSchema.parse({ metrics: ['wn8'] });

const createService = () => {
  const prisma = mockPrismaService();
  const data = mock<OverlayDataService>();
  const entitlements = mock<EntitlementsService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return {
    service: new OverlayService(prisma, mock<AppConfigService>(), entitlements, data, mock<CosmeticsReaderService>()),
    prisma,
    data,
    entitlements
  };
};

describe('OverlayService.preview', () => {
  it('refuses to preview the stats of an account the streamer has not linked', async () => {
    const { service, prisma, data } = createService();

    prisma.userLestaAccount.count.mockResolvedValue(0);

    await expect(service.preview({ userId: 'u1', accountId: 7, kind: 'wn8', config })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(data.preview).not.toHaveBeenCalled();
  });
});

describe('OverlayService.create', () => {
  it('checks the overlay count against the Plus limits before creating', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.overlay.count.mockResolvedValue(2);
    entitlements.assertWithinLimit.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'limit', { feature: 'overlays', limit: 2 }));

    await expect(service.create({ userId: 'u1', name: 'x', kind: 'wn8', config })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(entitlements.assertWithinLimit).toHaveBeenCalledWith({ userId: 'u1', key: 'overlays', count: 2, feature: 'overlays' });
    expect(prisma.overlay.create).not.toHaveBeenCalled();
  });
});
