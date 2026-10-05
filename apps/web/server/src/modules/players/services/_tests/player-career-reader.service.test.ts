import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountModeStats, AccountSnapshot, Player, TankModeStats } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { BattleStatsBlock } from '../../../../lib/lesta';
import type { VehicleCatalogService } from '../../../reference';
import type { LestaPlayerInfo } from '../../players.types';
import type { PlayerResolverService } from '../player-resolver.service';

import { CAREER_MODE_FROM_DB } from '../../../../common/lib';
import { PlayerCareerReaderService } from '../player-career-reader.service';

const UPDATED = new Date('2026-09-28T10:00:00Z');

const vehicle = (tankId: number): VehicleSummary => ({
  tankId,
  name: `Tank ${tankId}`,
  shortName: `T${tankId}`,
  slug: `tank-${tankId}`,
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
});

const block = (battles: number, extra: Partial<BattleStatsBlock> = {}): BattleStatsBlock => ({
  battles,
  wins: battles / 2,
  losses: battles / 2,
  draws: 0,
  xp: battles * 800,
  damage_dealt: battles * 2000,
  damage_received: battles * 1500,
  frags: battles,
  spotted: battles,
  capture_points: 0,
  dropped_capture_points: 0,
  hits: battles * 5,
  shots: battles * 6,
  survived_battles: battles / 4,
  ...extra
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const resolver = mock<PlayerResolverService>();
  const catalog = mock<VehicleCatalogService>();

  prisma.player.findUnique.mockResolvedValue(mock<Player>({ lastBattleAt: null, logoutAt: new Date('2026-09-28T20:00:00Z') }));
  prisma.accountModeStats.findMany.mockResolvedValue([]);
  prisma.tankModeStats.findMany.mockResolvedValue([]);
  catalog.summary.mockImplementation(async (tankId) => vehicle(tankId));

  return { service: new PlayerCareerReaderService(prisma, resolver, catalog), prisma, resolver, catalog };
};

describe('PlayerCareerReaderService.career', () => {
  it('reads records and the assist split from the latest snapshot and dates each record from the stored record times', async () => {
    const { service, prisma } = createService();
    const firstSeen = new Date('2026-08-01T10:00:00Z');

    prisma.accountSnapshot.findFirst.mockResolvedValueOnce(
      mock<AccountSnapshot>({
        maxDamage: 9100,
        maxDamageTankId: 5,
        maxXp: null,
        maxXpTankId: null,
        maxFrags: 0,
        maxFragsTankId: null,
        avgDamageAssisted: 640,
        avgDamageAssistedRadio: 400,
        avgDamageAssistedTrack: 240,
        avgDamageAssistedStun: 0
      })
    );

    prisma.accountModeStats.findUnique.mockResolvedValue(
      mock<AccountModeStats>({ maxDamage: 9100, maxDamageAt: firstSeen, maxXp: null, maxXpAt: null, maxFrags: 0, maxFragsAt: null })
    );

    const career = await service.career(1n);

    expect(career.source).toBe('stored');

    expect(career.records).toEqual({
      maxDamage: { value: 9100, vehicle: vehicle(5), achievedAt: firstSeen.toISOString() },
      maxXp: null,
      maxFrags: null
    });

    expect(career.assist).toEqual({ avgAssisted: 640, avgRadio: 400, avgTrack: 240, avgStun: 0 });
    expect(career.logoutAt).toBe('2026-09-28T20:00:00.000Z');
  });

  it('falls back to a live Lesta read for a player we have no snapshot of, without dating the records', async () => {
    const { service, prisma, resolver } = createService();

    prisma.accountSnapshot.findFirst.mockResolvedValue(null);

    resolver.fetchInfo.mockResolvedValue(
      mock<LestaPlayerInfo>({ statistics: { all: block(100), random: block(90, { max_xp: 2500, max_xp_tank_id: 3 }) } })
    );

    const career = await service.career(1n);

    expect(career.source).toBe('live');
    expect(career.records.maxXp).toEqual({ value: 2500, vehicle: vehicle(3), achievedAt: null });
    expect(prisma.accountModeStats.findUnique).not.toHaveBeenCalled();
  });

  it('answers with empty records when Lesta is down', async () => {
    const { service, prisma, resolver } = createService();

    prisma.accountSnapshot.findFirst.mockResolvedValue(null);
    resolver.fetchInfo.mockRejectedValue(new Error('SOURCE_NOT_AVAILABLE'));

    await expect(service.career(1n)).resolves.toMatchObject({ records: { maxDamage: null, maxXp: null, maxFrags: null }, assist: null });
  });
});

describe('PlayerCareerReaderService.modes', () => {
  it('serves the stored modes with their top tanks, busiest mode first', async () => {
    const { service, prisma } = createService();

    prisma.accountModeStats.findMany.mockResolvedValue([
      mock<AccountModeStats>({
        mode: 'ranked',
        battles: 10,
        wins: 5,
        damageDealt: 20_000n,
        xp: 8000n,
        frags: 9,
        survived: 3,
        maxDamage: 5000,
        updatedAt: UPDATED
      }),
      mock<AccountModeStats>({
        mode: 'epic',
        battles: 80,
        wins: 40,
        damageDealt: 160_000n,
        xp: 64_000n,
        frags: 70,
        survived: 20,
        maxDamage: 6000,
        updatedAt: UPDATED
      })
    ]);

    prisma.tankModeStats.findMany.mockResolvedValue([mock<TankModeStats>({ mode: 'epic', tankId: 9, battles: 50, wins: 30, damageDealt: 100_000 })]);

    const result = await service.modes({ accountId: 1n, allowLive: true });

    expect(result.source).toBe('stored');
    expect(result.modes.map((line) => line.mode)).toEqual([CAREER_MODE_FROM_DB.epic, CAREER_MODE_FROM_DB.ranked]);
    expect(result.modes[0]?.tanks).toEqual([{ vehicle: vehicle(9), battles: 50, winRate: 60, avgDamage: 2000 }]);
  });

  it('reads the mode blocks live only when allowed and nothing is stored', async () => {
    const { service, resolver } = createService();

    resolver.fetchModeBlocks.mockResolvedValue({ stronghold_skirmish: block(20), epic: block(0) });

    await expect(service.modes({ accountId: 1n, allowLive: false })).resolves.toMatchObject({ source: 'none', modes: [] });
    expect(resolver.fetchModeBlocks).not.toHaveBeenCalled();

    const live = await service.modes({ accountId: 1n, allowLive: true });

    expect(live.source).toBe('live');
    expect(live.modes.map((line) => [line.mode, line.battles])).toEqual([[CAREER_MODE_FROM_DB.strongholdSkirmish, 20]]);
  });
});
