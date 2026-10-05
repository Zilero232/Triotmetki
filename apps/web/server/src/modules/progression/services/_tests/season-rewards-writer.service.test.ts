import { SEASON_TRACK, seasonOf } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { SeasonProgress } from '../../../../../generated';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { SeasonRewardsWriterService } from '../season-rewards-writer.service';
import { ShellLedgerWriterService } from '../shell-ledger-writer.service';

const now = new Date('2026-09-26T10:00:00Z');
const season = seasonOf(now).code;
const pointsForLevel = (level: number) => level * SEASON_TRACK.pointsPerLevel;
const rewardsUpTo = (level: number) => SEASON_TRACK.rewards.filter((reward) => reward.level <= level);

const row = (fields: Pick<SeasonProgress, 'points'> & Partial<SeasonProgress>) => Object.assign(mock<SeasonProgress>(), { season, ...fields });

const setup = () => {
  const prisma = mockPrismaService();
  const ledger = mock<ShellLedgerWriterService>();

  ledger.grant.mockResolvedValue(true);
  prisma.seasonProgress.findUnique.mockResolvedValue(null);
  prisma.cosmeticOwnership.createMany.mockResolvedValue({ count: 1 });

  return { prisma, ledger, service: new SeasonRewardsWriterService(prisma, ledger) };
};

describe('SeasonRewardsWriterService.claimRewards', () => {
  it('claims nothing below the first reward level', async () => {
    const { ledger, prisma, service } = setup();

    expect(await service.claimRewards({ userId: 'u', now })).toBe(0);
    expect(ledger.grant).not.toHaveBeenCalled();
    expect(prisma.cosmeticOwnership.createMany).not.toHaveBeenCalled();
  });

  it('grants every earned shell and cosmetic reward', async () => {
    const { prisma, ledger, service } = setup();
    const level = SEASON_TRACK.rewards[2].level;
    const earned = rewardsUpTo(level);

    prisma.seasonProgress.findUnique.mockResolvedValue(row({ points: pointsForLevel(level) }));

    expect(await service.claimRewards({ userId: 'u', now })).toBe(earned.length);
    expect(ledger.grant).toHaveBeenCalledTimes(earned.filter((reward) => reward.kind === 'shells').length);
    expect(prisma.cosmeticOwnership.createMany).toHaveBeenCalledTimes(earned.filter((reward) => reward.kind === 'cosmetic').length);
  });

  it('grants season shells without adding season points', async () => {
    const { prisma, ledger, service } = setup();

    prisma.seasonProgress.findUnique.mockResolvedValue(row({ points: pointsForLevel(SEASON_TRACK.maxLevel) }));

    await service.claimRewards({ userId: 'u', now });

    expect(ledger.grant.mock.calls.every(([input]) => input.points === 0 && input.reason === 'season')).toBe(true);
  });

  it('counts nothing on a re-run where every reward already exists', async () => {
    const { prisma, ledger, service } = setup();

    prisma.seasonProgress.findUnique.mockResolvedValue(row({ points: pointsForLevel(SEASON_TRACK.maxLevel) }));
    ledger.grant.mockResolvedValue(false);
    prisma.cosmeticOwnership.createMany.mockResolvedValue({ count: 0 });

    expect(await service.claimRewards({ userId: 'u', now })).toBe(0);
    expect(prisma.cosmeticOwnership.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  it('keys each shell reward by season and level', async () => {
    const { prisma, ledger, service } = setup();

    prisma.seasonProgress.findUnique.mockResolvedValue(row({ points: pointsForLevel(SEASON_TRACK.maxLevel) }));

    await service.claimRewards({ userId: 'u', now });

    const keys = ledger.grant.mock.calls.map(([input]) => input.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => key.includes(season))).toBe(true);
  });
});
