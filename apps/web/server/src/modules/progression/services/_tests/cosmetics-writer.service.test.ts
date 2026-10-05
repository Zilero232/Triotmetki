import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppForbiddenException } from '../../../../common/exceptions';
import { advisoryLocks } from '../../../../core/prisma/_tests/prisma-mock';
import { SHELL_LEDGER } from '../../config/shell-ledger.constants';
import { defaultBanner, now, owned, plusBadge, setup, shopBadge } from './cosmetics.fixtures';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CosmeticsWriterService.purchase', () => {
  it('rejects an unknown cosmetic', async () => {
    const { writer } = setup();

    await expect(writer.purchase({ userId: 'u', code: 'no-such-item' })).rejects.toMatchObject({ status: 404 });
  });

  it('rejects items that are not sold', async () => {
    const { ledger, writer } = setup();

    await expect(writer.purchase({ userId: 'u', code: plusBadge?.code ?? '' })).rejects.toMatchObject({ status: 400 });
    await expect(writer.purchase({ userId: 'u', code: defaultBanner?.code ?? '' })).rejects.toMatchObject({ status: 400 });
    expect(ledger.spend).not.toHaveBeenCalled();
  });

  it('checks the cosmetics feature before spending', async () => {
    const { entitlements, ledger, writer } = setup();

    entitlements.assertFeature.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'Plus'));

    await expect(writer.purchase({ userId: 'u', code: shopBadge?.code ?? '' })).rejects.toMatchObject({ status: 403 });
    expect(ledger.spend).not.toHaveBeenCalled();
  });

  it('refuses to sell an item twice', async () => {
    const { prisma, ledger, writer } = setup();

    prisma.cosmeticOwnership.findUnique.mockResolvedValue(owned('u', shopBadge?.code ?? ''));

    await expect(writer.purchase({ userId: 'u', code: shopBadge?.code ?? '' })).rejects.toMatchObject({ status: 409 });
    expect(ledger.spend).not.toHaveBeenCalled();
  });

  it('spends the item price and records the purchase', async () => {
    const { prisma, ledger, writer } = setup();

    await writer.purchase({ userId: 'u', code: shopBadge?.code ?? '' });

    expect(ledger.spend).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u', amount: shopBadge?.price }));

    expect(prisma.cosmeticOwnership.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: shopBadge?.code, grant: 'purchase' }) })
    );
  });

  it('holds the shell lock of the user while it spends', async () => {
    const { queries, writer } = setup();

    await writer.purchase({ userId: 'u', code: shopBadge?.code ?? '' });

    expect(advisoryLocks(queries)).toEqual([[SHELL_LEDGER.lockScope, 'u']]);
  });

  it('records nothing when the balance is too low', async () => {
    const { prisma, ledger, writer } = setup();

    ledger.spend.mockRejectedValue(new Error('Not enough shells'));

    await expect(writer.purchase({ userId: 'u', code: shopBadge?.code ?? '' })).rejects.toThrow('Not enough shells');
    expect(prisma.cosmeticOwnership.create).not.toHaveBeenCalled();
  });
});

describe('CosmeticsWriterService.equip', () => {
  it('rejects an item in the wrong slot', async () => {
    const { writer } = setup();

    await expect(writer.equip({ userId: 'u', frame: shopBadge?.code })).rejects.toMatchObject({ status: 400 });
  });

  it('asks for Plus when equipping a Plus item without it', async () => {
    const { prisma, writer } = setup();

    await expect(writer.equip({ userId: 'u', badge: plusBadge?.code })).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'SUBSCRIPTION_REQUIRED' })
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses a shop item the user does not own', async () => {
    const { writer } = setup({ isPlus: true });

    await expect(writer.equip({ userId: 'u', badge: shopBadge?.code })).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'FORBIDDEN' })
    });
  });

  it('equips owned items and clears slots set to null', async () => {
    const { prisma, writer } = setup({ codes: [shopBadge?.code ?? ''] });

    await writer.equip({ userId: 'u', badge: shopBadge?.code, banner: null });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u' },
        data: { cosmeticBadge: shopBadge?.code, cosmeticFrame: undefined, cosmeticBanner: null }
      })
    );
  });
});
