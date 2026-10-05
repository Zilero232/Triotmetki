import type { Redis } from 'ioredis';

import { describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { AccountRating, Clan, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppNotFoundException } from '../../../../common/exceptions';
import { SIGNATURE } from '../../config';
import * as signatureLib from '../../lib';
import { SignatureService } from '../signature.service';

const at = new Date('2026-09-01T00:00:00Z');
const pngMagic = Buffer.from([137, 80, 78, 71]);

const player: Player = {
  accountId: 1n,
  nickname: 'Tanker',
  clanId: 100n,
  createdAt: null,
  lastBattleAt: null,
  trackingTier: 'population',
  lastPolledAt: null,
  nextPollAt: null,
  lastViewedAt: null,
  isHidden: false,
  logoutAt: null,
  progressionProcessedUntil: null,
  updatedAt: at
};

const rating: AccountRating = {
  accountId: 1n,
  period: 'overall',
  battles: 12_345,
  winRate: 53.21,
  avgDamage: 1_850,
  avgFrags: 1,
  avgTier: null,
  wn8: 2_100,
  eff: null,
  broneIndex: null,
  fromCapturedAt: null,
  toCapturedAt: null,
  computedAt: at
};

const clan: Clan = {
  clanId: 100n,
  tag: 'BRNV',
  name: 'Three Marks',
  color: null,
  motto: null,
  description: null,
  emblems: null,
  membersCount: 1,
  isDisbanded: false,
  isTracked: false,
  strongholdLevel: null,
  stronghold: null,
  strongholdUpdatedAt: null,
  createdAt: null,
  lastPolledAt: null,
  updatedAt: at
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const redis = mockDeep<Redis>();

  redis.getBuffer.mockResolvedValue(null);
  prisma.player.findFirst.mockResolvedValue(player);
  prisma.accountRating.findUnique.mockResolvedValue(rating);
  prisma.clan.findUnique.mockResolvedValue(clan);

  return { service: new SignatureService(prisma, redis), prisma, redis };
};

describe('SignatureService.png', () => {
  it('serves the cached image without touching the database', async () => {
    const { service, prisma, redis } = createService();
    const cached = Buffer.from('cached');

    redis.getBuffer.mockResolvedValue(cached);

    expect(await service.png('Tanker')).toBe(cached);
    expect(redis.getBuffer).toHaveBeenCalledWith(`${SIGNATURE.cachePrefix}tanker`);
    expect(prisma.player.findFirst).not.toHaveBeenCalled();
  });

  it('reports an unknown nickname as a missing player', async () => {
    const { service, prisma, redis } = createService();

    prisma.player.findFirst.mockResolvedValue(null);

    const failure = service.png('Nobody');

    await expect(failure).rejects.toBeInstanceOf(AppNotFoundException);
    await expect(failure).rejects.toMatchObject({ response: { code: 'PLAYER_NOT_FOUND' } });
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('renders a PNG and caches it under the lowercased nickname', async () => {
    const { service, redis } = createService();

    const png = await service.png('TANKER');

    expect(png.subarray(0, pngMagic.length)).toEqual(pngMagic);
    expect(redis.set).toHaveBeenCalledWith(`${SIGNATURE.cachePrefix}tanker`, png, 'EX', SIGNATURE.cacheSeconds);
  });

  it('skips the clan lookup for a player without a clan', async () => {
    const { service, prisma } = createService();

    prisma.player.findFirst.mockResolvedValue({ ...player, clanId: null });

    await service.png('Tanker');

    expect(prisma.clan.findUnique).not.toHaveBeenCalled();
  });

  it('passes the win rate to the image as a fraction, since ratings store it in percent', async () => {
    const { service } = createService();
    const render = vi.spyOn(signatureLib, 'renderSignature');

    await service.png('Tanker');

    expect(render.mock.calls[0]?.[0].data.winRate).toBeCloseTo(0.5321);
    render.mockRestore();
  });
});
