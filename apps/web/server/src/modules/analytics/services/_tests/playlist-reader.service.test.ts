import type { PlayerMarkRow, PlayerMarks } from '@otmetki/schemas';

import { PLAYLIST } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PlayerTank } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { EntitlementsService } from '../../../billing';
import { MissionProgressReaderService } from '../../../missions';
import { PlayerMarksReaderService } from '../../../players';
import { VehicleCatalogService } from '../../../reference';
import { PLAYLIST_RULES } from '../../config/playlist.constants';
import { FirstWinReaderService } from '../first-win-reader.service';
import { OwnAccountReaderService } from '../own-account-reader.service';
import { PlaylistReaderService } from '../playlist-reader.service';
import { catalogOf, vehicle } from './analytics.fixtures';

const now = new Date('2026-09-26T10:00:00Z');
const accountId = 7n;
const heavy = vehicle({ tankId: 1, tier: PLAYLIST_RULES.minTier + 3, type: 'heavyTank' });
const medium = vehicle({ tankId: 2, tier: PLAYLIST_RULES.minTier + 3, type: 'mediumTank' });

const garageTank = (fields: Pick<PlayerTank, 'battles' | 'lastBattleAt' | 'tankId' | 'wins'>) => Object.assign(mock<PlayerTank>(), fields);

const marksOf = (...items: PlayerMarkRow[]): PlayerMarks => ({ summary: { moe3: 0, moe2: 0, moe1: 0, mastery: 0, eligible: 0 }, items });

const markRow = (fields: Pick<PlayerMarkRow, 'damageToNextMark' | 'moePercent' | 'nextMarkPercent' | 'vehicle'>): PlayerMarkRow => ({
  battles: 100,
  marksOnGun: 1,
  markOfMastery: 0,
  movingDamage: null,
  avgCombinedDamage: null,
  combinedDamageSource: null,
  thresholds: null,
  updatedAt: null,
  ...fields
});

const setup = ({ isPlus }: { isPlus: boolean }) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const accounts = mock<OwnAccountReaderService>();
  const firstWin = mock<FirstWinReaderService>();
  const marks = mock<PlayerMarksReaderService>();
  const missions = mock<MissionProgressReaderService>();
  const entitlements = mock<EntitlementsService>();

  entitlements.isPlus.mockResolvedValue(isPlus);
  accounts.find.mockResolvedValue(accountId);
  catalog.all.mockResolvedValue(catalogOf(heavy, medium));
  firstWin.taken.mockResolvedValue(new Set());
  marks.marks.mockResolvedValue(marksOf());
  missions.next.mockResolvedValue(null);
  prisma.playerTank.findMany.mockResolvedValue([]);

  return {
    prisma,
    accounts,
    firstWin,
    marks,
    missions,
    service: new PlaylistReaderService(prisma, catalog, accounts, firstWin, marks, missions, entitlements)
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlaylistReaderService.playlist', () => {
  it('reports noLink with the size of the viewer tier', async () => {
    const free = setup({ isPlus: false });
    const plus = setup({ isPlus: true });

    free.accounts.find.mockResolvedValue(null);
    plus.accounts.find.mockResolvedValue(null);

    const freeList = await free.service.playlist({ userId: 'u' });
    const plusList = await plus.service.playlist({ userId: 'u' });

    expect(freeList).toMatchObject({ state: 'noLink', accountId: null, items: [], isExtended: false, size: PLAYLIST.freeSize });
    expect(plusList).toMatchObject({ state: 'noLink', isExtended: true, size: PLAYLIST.plusSize });
    expect(plusList.size).toBeGreaterThan(freeList.size);
  });

  it('reports noGarage when the account has no garage tanks', async () => {
    const { service, marks } = setup({ isPlus: false });

    expect(await service.playlist({ userId: 'u' })).toMatchObject({ state: 'noGarage', items: [] });
    expect(marks.marks).not.toHaveBeenCalled();
  });

  it('suggests a tank whose first win of the day is still available', async () => {
    const { prisma, firstWin, service } = setup({ isPlus: false });

    prisma.playerTank.findMany.mockResolvedValue([
      garageTank({ tankId: heavy.tankId, battles: 10, wins: 5, lastBattleAt: now }),
      garageTank({ tankId: medium.tankId, battles: 10, wins: 5, lastBattleAt: now })
    ]);

    firstWin.taken.mockResolvedValue(new Set([medium.tankId]));

    const playlist = await service.playlist({ userId: 'u' });

    expect(playlist.state).toBe('ready');
    expect(playlist.items.map((item) => item.vehicle.tankId)).toEqual([heavy.tankId]);
    expect(playlist.items[0]?.reasons).toContain('firstWin');
  });

  it('carries the damage to the next mark for a tank close to it', async () => {
    const { prisma, firstWin, marks, service } = setup({ isPlus: false });

    prisma.playerTank.findMany.mockResolvedValue([garageTank({ tankId: heavy.tankId, battles: 10, wins: 5, lastBattleAt: now })]);
    firstWin.taken.mockResolvedValue(new Set([heavy.tankId]));
    marks.marks.mockResolvedValue(marksOf(markRow({ vehicle: heavy, moePercent: 84, nextMarkPercent: 85, damageToNextMark: 120 })));

    const [item] = (await service.playlist({ userId: 'u' })).items;

    expect(item?.reasons).toEqual(['closeToMark']);
    expect(item?.damageToNextMark).toBe(120);
  });

  it('keeps Plus-only reasons and mission lookups away from free viewers', async () => {
    const { prisma, firstWin, missions, service } = setup({ isPlus: false });

    prisma.playerTank.findMany.mockResolvedValue([
      garageTank({ tankId: heavy.tankId, battles: PLAYLIST_RULES.lowWinRateMinBattles, wins: 0, lastBattleAt: now })
    ]);

    firstWin.taken.mockResolvedValue(new Set([heavy.tankId]));

    const playlist = await service.playlist({ userId: 'u' });

    expect(playlist.items).toEqual([]);
    expect(missions.next).not.toHaveBeenCalled();
  });

  it('flags tanks of a class the next personal mission asks for, for Plus viewers', async () => {
    const { prisma, firstWin, missions, service } = setup({ isPlus: true });

    prisma.playerTank.findMany.mockResolvedValue([
      garageTank({ tankId: heavy.tankId, battles: 10, wins: 5, lastBattleAt: now }),
      garageTank({ tankId: medium.tankId, battles: 10, wins: 5, lastBattleAt: now })
    ]);

    firstWin.taken.mockResolvedValue(new Set([heavy.tankId, medium.tankId]));

    missions.next.mockResolvedValue({
      operationName: 'Op',
      campaignId: 1,
      operationId: 1,
      missions: [
        { branchKey: 'heavyTank', title: 'H', condition: null },
        { branchKey: 'notAClass', title: 'X', condition: null }
      ]
    });

    const playlist = await service.playlist({ userId: 'u' });

    expect(playlist.items.map((item) => [item.vehicle.tankId, item.reasons])).toEqual([[heavy.tankId, ['mission']]]);
  });

  it('marks a tank unplayed for a long time with the day count', async () => {
    const { prisma, firstWin, service } = setup({ isPlus: false });
    const lastBattleAt = new Date(now.getTime() - PLAYLIST_RULES.longUnplayedDays * 86_400_000);

    prisma.playerTank.findMany.mockResolvedValue([garageTank({ tankId: heavy.tankId, battles: 10, wins: 5, lastBattleAt })]);
    firstWin.taken.mockResolvedValue(new Set([heavy.tankId]));

    const [item] = (await service.playlist({ userId: 'u' })).items;

    expect(item?.reasons).toEqual(['longUnplayed']);
    expect(item?.daysSinceBattle).toBe(PLAYLIST_RULES.longUnplayedDays);
  });

  it('skips garage tanks missing from the catalog', async () => {
    const { prisma, service } = setup({ isPlus: false });

    prisma.playerTank.findMany.mockResolvedValue([garageTank({ tankId: 999, battles: 10, wins: 5, lastBattleAt: null })]);

    expect((await service.playlist({ userId: 'u' })).items).toEqual([]);
  });

  it('keeps the same seed for the whole game day and changes it after the reset', async () => {
    const { service } = setup({ isPlus: false });

    const morning = await service.playlist({ userId: 'u' });

    vi.setSystemTime(new Date(now.getTime() + 3_600_000));

    const later = await service.playlist({ userId: 'u' });

    vi.setSystemTime(new Date(now.getTime() + 86_400_000));

    const tomorrow = await service.playlist({ userId: 'u' });

    expect(later.seed).toBe(morning.seed);
    expect(tomorrow.seed).not.toBe(morning.seed);
  });

  it('uses an explicit seed over the daily one', async () => {
    const { service } = setup({ isPlus: false });

    expect((await service.playlist({ userId: 'u', seed: 42 })).seed).toBe(42);
  });
});
