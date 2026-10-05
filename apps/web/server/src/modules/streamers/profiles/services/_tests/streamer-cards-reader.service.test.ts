import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, PlayerTank, StreamerProfile, Vehicle } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { ProfileCardRow } from '../../selects/profile-card.types';

import { STREAMERS } from '../../config/directory.constants';
import { StreamerCardsReaderService } from '../streamer-cards-reader.service';

const CHECKED_AT = new Date('2026-09-20T18:00:00Z');
const ACCOUNT = 1001n;

const profileRow = (overrides: Partial<StreamerProfile> = {}): StreamerProfile => ({
  id: 'p1',
  userId: 'u1',
  kind: 'claimed',
  slug: 'jove',
  displayName: 'Jove',
  accountId: ACCOUNT,
  accountSourceUrl: null,
  bio: null,
  links: null,
  settings: null,
  settingsUpdatedAt: null,
  isLive: false,
  liveTankId: null,
  liveViewers: null,
  livePlatform: null,
  liveStartedAt: null,
  liveCheckedAt: null,
  hiddenAt: null,
  mergedIntoId: null,
  createdAt: CHECKED_AT,
  updatedAt: CHECKED_AT,
  ...overrides
});

const cardProfile = (overrides: Partial<ProfileCardRow> = {}): ProfileCardRow => ({
  ...profileRow(),
  channels: [],
  ...overrides
});

const tankRow = (tankId: number, battles: number, accountId = ACCOUNT) => mock<PlayerTank>({ accountId, tankId, battles });

type TankGroup = Awaited<ReturnType<PrismaService['playerTank']['groupBy']>>[number];

const marksGroup = (accountId: bigint, count: number) => mock<TankGroup>({ accountId, _count: { _all: count } });

const vehicleRow = (tankId: number, name: string) => mock<Vehicle>({ tankId, name });

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.accountRating.findMany.mockResolvedValue([]);
  prisma.playerTank.findMany.mockResolvedValue([]);
  vi.mocked(prisma.playerTank.groupBy).mockResolvedValue([]);
  prisma.vehicle.findMany.mockResolvedValue([]);

  return { service: new StreamerCardsReaderService(prisma), prisma };
};

describe('StreamerCardsReaderService.live', () => {
  it('returns null for a streamer who is offline', async () => {
    const { service } = createService();

    expect(await service.live(profileRow({ isLive: false, livePlatform: 'twitch' }))).toBeNull();
  });

  it('returns null for a live flag without a platform', async () => {
    const { service } = createService();

    expect(await service.live(profileRow({ isLive: true, livePlatform: null }))).toBeNull();
  });

  it('names the tank being played', async () => {
    const { service, prisma } = createService();

    prisma.vehicle.findUnique.mockResolvedValue(vehicleRow(7169, 'IS-7'));

    expect(
      await service.live(profileRow({ isLive: true, livePlatform: 'twitch', liveViewers: 420, liveTankId: 7169, liveCheckedAt: CHECKED_AT }))
    ).toEqual({ platform: 'twitch', viewers: 420, tankId: 7169, tankName: 'IS-7', checkedAt: CHECKED_AT.toISOString() });
  });

  it('skips the tank lookup when no tank is known', async () => {
    const { service, prisma } = createService();

    const live = await service.live(profileRow({ isLive: true, livePlatform: 'youtube' }));

    expect(live).toMatchObject({ tankId: null, tankName: null, checkedAt: null });
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
  });
});

describe('StreamerCardsReaderService.cards', () => {
  it('limits favourite tanks to the most played ones and names them', async () => {
    const { service, prisma } = createService();
    const tanks = [tankRow(1, 900), tankRow(2, 800), tankRow(3, 700), tankRow(4, 600), tankRow(5, 500)];

    prisma.playerTank.findMany.mockResolvedValue(tanks);
    prisma.vehicle.findMany.mockResolvedValue([vehicleRow(1, 'T-34'), vehicleRow(2, 'KV-1')]);

    const [card] = await service.cards([cardProfile()]);

    expect(card?.favouriteTanks).toHaveLength(Math.min(STREAMERS.favouriteTanks, tanks.length));
    expect(card?.favouriteTanks[0]).toEqual({ tankId: 1, name: 'T-34', battles: 900 });
    expect(card?.favouriteTanks.map((tank) => tank.tankId)).toEqual(tanks.slice(0, STREAMERS.favouriteTanks).map((tank) => tank.tankId));
  });

  it('keeps each streamer’s stats, marks and tanks apart', async () => {
    const { service, prisma } = createService();
    const other = 2002n;

    prisma.accountRating.findMany.mockResolvedValue([mock<AccountRating>({ accountId: other, battles: 5000, winRate: 55, wn8: 2500 })]);
    vi.mocked(prisma.playerTank.groupBy).mockResolvedValue([marksGroup(ACCOUNT, 4)]);
    prisma.playerTank.findMany.mockResolvedValue([tankRow(1, 100, other)]);

    const [jove, second] = await service.cards([cardProfile(), cardProfile({ slug: 'nidin', accountId: other })]);

    expect(jove).toMatchObject({ stats: null, marks3: 4, favouriteTanks: [] });
    expect(second).toMatchObject({ stats: { battles: 5000, winRate: 55, wn8: 2500 }, marks3: 0, favouriteTanks: [{ tankId: 1 }] });
  });

  it('leaves stats and marks null for a streamer without a game account', async () => {
    const { service } = createService();

    const [card] = await service.cards([cardProfile({ accountId: null, settings: {} })]);

    expect(card).toMatchObject({ stats: null, marks3: null, favouriteTanks: [], hasSettings: true });
  });

  it('shows the live tank name from the same vehicle lookup', async () => {
    const { service, prisma } = createService();

    prisma.vehicle.findMany.mockResolvedValue([vehicleRow(7169, 'IS-7')]);

    const [card] = await service.cards([cardProfile({ isLive: true, livePlatform: 'twitch', liveViewers: 10, liveTankId: 7169 })]);

    expect(card?.live).toMatchObject({ platform: 'twitch', viewers: 10, tankName: 'IS-7' });
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tankId: { in: [7169] } } }));
  });

  it('shows no live block for an offline streamer', async () => {
    const { service } = createService();

    const [card] = await service.cards([cardProfile({ isLive: false, livePlatform: 'twitch' })]);

    expect(card?.live).toBeNull();
  });
});
