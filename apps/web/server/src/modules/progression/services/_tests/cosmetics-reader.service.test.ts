import { OVERLAY_THEMES } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Subscription, UserLestaAccount } from '../../../../../generated';

import { NO_COSMETICS } from '../../config/cosmetics.constants';
import { defaultBanner, equipped, now, plusBadge, seasonBadge, setup, shopBadge, shopTheme } from './cosmetics.fixtures';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CosmeticsReaderService.inventory', () => {
  it('treats default items as owned and nothing else for a new free user', async () => {
    const { reader } = setup();

    const inventory = await reader.inventory('u');

    expect(inventory.equipped).toEqual(NO_COSMETICS);
    expect(inventory.items.filter((item) => item.isOwned).every((item) => item.source === 'default')).toBe(true);
    expect(inventory.items.find((item) => item.code === plusBadge?.code)?.isUsable).toBe(false);
  });

  it('reads the equipped slots from the user cosmetic columns', async () => {
    const { prisma, reader } = setup();

    prisma.user.findUnique.mockResolvedValue(equipped('u', { cosmeticBadge: shopBadge?.code ?? null }));

    expect((await reader.inventory('u')).equipped).toEqual({ badge: shopBadge?.code, frame: null, banner: null });
  });

  it('lets Plus members use Plus items without owning them', async () => {
    const { reader } = setup({ isPlus: true });

    const item = (await reader.inventory('u')).items.find((entry) => entry.code === plusBadge?.code);

    expect(item).toMatchObject({ isOwned: false, isUsable: true });
  });

  it('adds owned seasonal rewards to the catalog', async () => {
    const { reader } = setup({ codes: [seasonBadge] });

    const item = (await reader.inventory('u')).items.find((entry) => entry.code === seasonBadge);

    expect(item).toMatchObject({ source: 'season', isOwned: true, isUsable: true, acquiredAt: now.toISOString() });
  });
});

describe('CosmeticsReaderService.profiles', () => {
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
    const { reader } = setupProfiles({ plusUsers: ['u'] });

    expect((await reader.profiles([1, 2, 2])).map((profile) => profile.accountId)).toEqual([1]);
  });

  it('loads only owners that have at least one slot equipped', async () => {
    const { prisma, reader } = setupProfiles({ plusUsers: [] });

    await reader.profiles([1, 2]);

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
    const { reader } = setupProfiles({ plusUsers: [] });

    const [profile] = await reader.profiles([1]);

    expect(profile).toMatchObject({ badge: null, banner: defaultBanner?.code });
  });

  it('falls back to no cosmetics for a single unknown profile', async () => {
    const { prisma, reader } = setup();

    prisma.userLestaAccount.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.subscription.findMany.mockResolvedValue([]);

    expect(await reader.profile(5)).toEqual({ accountId: 5, ...NO_COSMETICS });
  });
});

describe('CosmeticsReaderService overlay themes', () => {
  it('allows standard themes without any check', async () => {
    const { entitlements, reader } = setup();

    await reader.assertOverlayTheme({ userId: 'u', theme: OVERLAY_THEMES.standard[0] });

    expect(entitlements.assertFeature).not.toHaveBeenCalled();
  });

  it('refuses a premium theme bought by nobody', async () => {
    const { reader } = setup({ isPlus: true });

    await expect(reader.assertOverlayTheme({ userId: 'u', theme: shopTheme ?? OVERLAY_THEMES.fallback })).rejects.toMatchObject({ status: 403 });
  });

  it('accepts an owned premium theme for Plus members', async () => {
    const { reader } = setup({ isPlus: true, codes: [`overlay-${shopTheme}`] });

    await expect(reader.assertOverlayTheme({ userId: 'u', theme: shopTheme ?? OVERLAY_THEMES.fallback })).resolves.toBeUndefined();
  });

  it('shows the fallback theme when an owned premium theme lost Plus', async () => {
    const { reader } = setup({ isPlus: false, codes: [`overlay-${shopTheme}`] });

    expect(await reader.effectiveOverlayTheme({ userId: 'u', theme: shopTheme ?? OVERLAY_THEMES.fallback })).toBe(OVERLAY_THEMES.fallback);
  });

  it('keeps a standard theme as is', async () => {
    const { reader } = setup();

    expect(await reader.effectiveOverlayTheme({ userId: 'u', theme: OVERLAY_THEMES.standard[1] })).toBe(OVERLAY_THEMES.standard[1]);
  });
});
