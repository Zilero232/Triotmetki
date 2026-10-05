import type { CompiledQuery } from 'kysely';

import { catalogCosmetics, OVERLAY_THEMES, seasonalCosmeticCode } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CosmeticOwnership, Subscription, User, UserLestaAccount } from '../../../../../generated';

import { AppForbiddenException } from '../../../../common/exceptions';
import { advisoryLocks, mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { EntitlementsService } from '../../../billing';
import { NO_COSMETICS } from '../../config/cosmetics.constants';
import { SHELL_LEDGER } from '../../config/shell-ledger.constants';
import { CosmeticsService } from '../cosmetics.service';
import { ShellLedgerWriterService } from '../shell-ledger-writer.service';

const now = new Date('2026-09-26T10:00:00Z');
const shopBadge = catalogCosmetics().find((item) => item.slot === 'badge' && item.source === 'shop');
const plusBadge = catalogCosmetics().find((item) => item.slot === 'badge' && item.source === 'plus');
const defaultBanner = catalogCosmetics().find((item) => item.slot === 'banner' && item.source === 'default');
const shopTheme = OVERLAY_THEMES.premium.find((theme) =>
  catalogCosmetics().some((item) => item.code === `overlay-${theme}` && item.source === 'shop')
);

const seasonBadge = seasonalCosmeticCode({ season: '2026-q3', slot: 'badge', grade: 'gold' });

const owned = (userId: string, code: string) => Object.assign(mock<CosmeticOwnership>(), { userId, code, acquiredAt: now });

const equipped = (id: string, fields: Partial<Pick<User, 'cosmeticBadge' | 'cosmeticBanner' | 'cosmeticFrame'>>) =>
  Object.assign(mock<User>(), { id, cosmeticBadge: null, cosmeticFrame: null, cosmeticBanner: null, ...fields });

const setup = ({ isPlus = false, codes = [] }: { isPlus?: boolean; codes?: string[] } = {}) => {
  const queries: CompiledQuery[] = [];
  const prisma = mockPrismaService({ queries });
  const entitlements = mock<EntitlementsService>();
  const ledger = mock<ShellLedgerWriterService>();

  entitlements.isPlus.mockResolvedValue(isPlus);
  ledger.balance.mockResolvedValue(0);
  prisma.cosmeticOwnership.findMany.mockResolvedValue(codes.map((code) => owned('u', code)));
  prisma.cosmeticOwnership.count.mockResolvedValue(codes.length);
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.cosmeticOwnership.findUnique.mockResolvedValue(null);
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return { prisma, queries, entitlements, ledger, service: new CosmeticsService(prisma, entitlements, ledger) };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CosmeticsService.inventory', () => {
  it('treats default items as owned and nothing else for a new free user', async () => {
    const { service } = setup();

    const inventory = await service.inventory('u');

    expect(inventory.equipped).toEqual(NO_COSMETICS);
    expect(inventory.items.filter((item) => item.isOwned).every((item) => item.source === 'default')).toBe(true);
    expect(inventory.items.find((item) => item.code === plusBadge?.code)?.isUsable).toBe(false);
  });

  it('reads the equipped slots from the user cosmetic columns', async () => {
    const { prisma, service } = setup();

    prisma.user.findUnique.mockResolvedValue(equipped('u', { cosmeticBadge: shopBadge?.code ?? null }));

    expect((await service.inventory('u')).equipped).toEqual({ badge: shopBadge?.code, frame: null, banner: null });
  });

  it('lets Plus members use Plus items without owning them', async () => {
    const { service } = setup({ isPlus: true });

    const item = (await service.inventory('u')).items.find((entry) => entry.code === plusBadge?.code);

    expect(item).toMatchObject({ isOwned: false, isUsable: true });
  });

  it('adds owned seasonal rewards to the catalog', async () => {
    const { service } = setup({ codes: [seasonBadge] });

    const item = (await service.inventory('u')).items.find((entry) => entry.code === seasonBadge);

    expect(item).toMatchObject({ source: 'season', isOwned: true, isUsable: true, acquiredAt: now.toISOString() });
  });
});

describe('CosmeticsService.purchase', () => {
  it('rejects an unknown cosmetic', async () => {
    const { service } = setup();

    await expect(service.purchase({ userId: 'u', code: 'no-such-item' })).rejects.toMatchObject({ status: 404 });
  });

  it('rejects items that are not sold', async () => {
    const { ledger, service } = setup();

    await expect(service.purchase({ userId: 'u', code: plusBadge?.code ?? '' })).rejects.toMatchObject({ status: 400 });
    await expect(service.purchase({ userId: 'u', code: defaultBanner?.code ?? '' })).rejects.toMatchObject({ status: 400 });
    expect(ledger.spend).not.toHaveBeenCalled();
  });

  it('checks the cosmetics feature before spending', async () => {
    const { entitlements, ledger, service } = setup();

    entitlements.assertFeature.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'Plus'));

    await expect(service.purchase({ userId: 'u', code: shopBadge?.code ?? '' })).rejects.toMatchObject({ status: 403 });
    expect(ledger.spend).not.toHaveBeenCalled();
  });

  it('refuses to sell an item twice', async () => {
    const { prisma, ledger, service } = setup();

    prisma.cosmeticOwnership.findUnique.mockResolvedValue(owned('u', shopBadge?.code ?? ''));

    await expect(service.purchase({ userId: 'u', code: shopBadge?.code ?? '' })).rejects.toMatchObject({ status: 409 });
    expect(ledger.spend).not.toHaveBeenCalled();
  });

  it('spends the item price and records the purchase', async () => {
    const { prisma, ledger, service } = setup();

    await service.purchase({ userId: 'u', code: shopBadge?.code ?? '' });

    expect(ledger.spend).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u', amount: shopBadge?.price }));

    expect(prisma.cosmeticOwnership.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: shopBadge?.code, grant: 'purchase' }) })
    );
  });

  it('holds the shell lock of the user while it spends', async () => {
    const { queries, service } = setup();

    await service.purchase({ userId: 'u', code: shopBadge?.code ?? '' });

    expect(advisoryLocks(queries)).toEqual([[SHELL_LEDGER.lockScope, 'u']]);
  });

  it('records nothing when the balance is too low', async () => {
    const { prisma, ledger, service } = setup();

    ledger.spend.mockRejectedValue(new Error('Not enough shells'));

    await expect(service.purchase({ userId: 'u', code: shopBadge?.code ?? '' })).rejects.toThrow('Not enough shells');
    expect(prisma.cosmeticOwnership.create).not.toHaveBeenCalled();
  });
});

describe('CosmeticsService.equip', () => {
  it('rejects an item in the wrong slot', async () => {
    const { service } = setup();

    await expect(service.equip({ userId: 'u', frame: shopBadge?.code })).rejects.toMatchObject({ status: 400 });
  });

  it('asks for Plus when equipping a Plus item without it', async () => {
    const { prisma, service } = setup();

    await expect(service.equip({ userId: 'u', badge: plusBadge?.code })).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'SUBSCRIPTION_REQUIRED' })
    });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses a shop item the user does not own', async () => {
    const { service } = setup({ isPlus: true });

    await expect(service.equip({ userId: 'u', badge: shopBadge?.code })).rejects.toMatchObject({
      status: 403,
      response: expect.objectContaining({ code: 'FORBIDDEN' })
    });
  });

  it('equips owned items and clears slots set to null', async () => {
    const { prisma, service } = setup({ codes: [shopBadge?.code ?? ''] });

    await service.equip({ userId: 'u', badge: shopBadge?.code, banner: null });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u' },
        data: { cosmeticBadge: shopBadge?.code, cosmeticFrame: undefined, cosmeticBanner: null }
      })
    );
  });
});

describe('CosmeticsService.profiles', () => {
  const setupProfiles = ({ plusUsers }: { plusUsers: string[] }) => {
    const context = setup();

    context.prisma.userLestaAccount.findMany.mockResolvedValue([
      Object.assign(mock<UserLestaAccount>(), { accountId: 1n, userId: 'u' }),
      Object.assign(mock<UserLestaAccount>(), { accountId: 2n, userId: 'v' })
    ]);

    context.prisma.user.findMany.mockResolvedValue([
      equipped('u', { cosmeticBadge: plusBadge?.code ?? null, cosmeticBanner: defaultBanner?.code ?? null })
    ]);

    context.prisma.cosmeticOwnership.findMany.mockResolvedValue([]);
    context.prisma.subscription.findMany.mockResolvedValue(plusUsers.map((userId) => Object.assign(mock<Subscription>(), { userId })));

    return context;
  };

  it('skips accounts whose owner equipped nothing', async () => {
    const { service } = setupProfiles({ plusUsers: ['u'] });

    expect((await service.profiles([1, 2, 2])).map((profile) => profile.accountId)).toEqual([1]);
  });

  it('loads only owners that have at least one slot equipped', async () => {
    const { prisma, service } = setupProfiles({ plusUsers: [] });

    await service.profiles([1, 2]);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['u', 'v'] },
          OR: [{ cosmeticBadge: { not: null } }, { cosmeticFrame: { not: null } }, { cosmeticBanner: { not: null } }]
        }
      })
    );
  });

  it('hides Plus items once the subscription lapsed but keeps default ones', async () => {
    const { service } = setupProfiles({ plusUsers: [] });

    const [profile] = await service.profiles([1]);

    expect(profile).toMatchObject({ badge: null, banner: defaultBanner?.code });
  });

  it('falls back to no cosmetics for a single unknown profile', async () => {
    const { prisma, service } = setup();

    prisma.userLestaAccount.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.subscription.findMany.mockResolvedValue([]);

    expect(await service.profile(5)).toEqual({ accountId: 5, ...NO_COSMETICS });
  });
});

describe('CosmeticsService overlay themes', () => {
  it('allows standard themes without any check', async () => {
    const { entitlements, service } = setup();

    await service.assertOverlayTheme({ userId: 'u', theme: OVERLAY_THEMES.standard[0] });

    expect(entitlements.assertFeature).not.toHaveBeenCalled();
  });

  it('refuses a premium theme bought by nobody', async () => {
    const { service } = setup({ isPlus: true });

    await expect(service.assertOverlayTheme({ userId: 'u', theme: shopTheme ?? OVERLAY_THEMES.fallback })).rejects.toMatchObject({ status: 403 });
  });

  it('accepts an owned premium theme for Plus members', async () => {
    const { service } = setup({ isPlus: true, codes: [`overlay-${shopTheme}`] });

    await expect(service.assertOverlayTheme({ userId: 'u', theme: shopTheme ?? OVERLAY_THEMES.fallback })).resolves.toBeUndefined();
  });

  it('shows the fallback theme when an owned premium theme lost Plus', async () => {
    const { service } = setup({ isPlus: false, codes: [`overlay-${shopTheme}`] });

    expect(await service.effectiveOverlayTheme({ userId: 'u', theme: shopTheme ?? OVERLAY_THEMES.fallback })).toBe(OVERLAY_THEMES.fallback);
  });

  it('keeps a standard theme as is', async () => {
    const { service } = setup();

    expect(await service.effectiveOverlayTheme({ userId: 'u', theme: OVERLAY_THEMES.standard[1] })).toBe(OVERLAY_THEMES.standard[1]);
  });
});
