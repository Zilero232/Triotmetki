import { SEASON_TRACK, seasonOf } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { SeasonProgress, UserLestaAccount } from '../../../../../generated';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { EntitlementsService } from '../../../billing';
import { SeasonReaderService } from '../season-reader.service';

const now = new Date('2026-09-26T10:00:00Z');
const season = seasonOf(now).code;
const pointsForLevel = (level: number) => level * SEASON_TRACK.pointsPerLevel;
const rewardsUpTo = (level: number) => SEASON_TRACK.rewards.filter((reward) => reward.level <= level);

const row = (fields: Pick<SeasonProgress, 'points'> & Partial<SeasonProgress>) => Object.assign(mock<SeasonProgress>(), { season, ...fields });

const setup = () => {
  const prisma = mockPrismaService();
  const entitlements = mock<EntitlementsService>();

  entitlements.isPlus.mockResolvedValue(true);
  prisma.seasonProgress.findUnique.mockResolvedValue(null);

  return { prisma, entitlements, service: new SeasonReaderService(prisma, entitlements) };
};

describe('SeasonReaderService.track', () => {
  it('starts a new season at level zero with every reward unclaimed', async () => {
    const { service } = setup();

    const track = await service.track({ userId: 'u', now });

    expect(track).toMatchObject({ points: 0, level: 0, maxLevel: SEASON_TRACK.maxLevel, isAccruing: true });
    expect(track.rewards.every((reward) => !reward.isClaimed)).toBe(true);
  });

  it('marks rewards up to the current level as claimed', async () => {
    const { prisma, service } = setup();
    const level = SEASON_TRACK.rewards[1].level;

    prisma.seasonProgress.findUnique.mockResolvedValue(row({ points: pointsForLevel(level) }));

    const track = await service.track({ userId: 'u', now });

    expect(track.level).toBe(level);
    expect(track.rewards.filter((reward) => reward.isClaimed)).toHaveLength(rewardsUpTo(level).length);
  });

  it('reports that points do not accrue without Plus', async () => {
    const { entitlements, service } = setup();

    entitlements.isPlus.mockResolvedValue(false);

    expect((await service.track({ userId: 'u', now })).isAccruing).toBe(false);
  });

  it('describes the season containing now', async () => {
    const { service } = setup();

    const { season: window } = await service.track({ userId: 'u', now });

    expect(new Date(window.startsAt).getTime()).toBeLessThanOrEqual(now.getTime());
    expect(new Date(window.endsAt).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('SeasonReaderService.history', () => {
  it('is empty for an account nobody linked', async () => {
    const { prisma, service } = setup();

    prisma.userLestaAccount.findUnique.mockResolvedValue(null);

    expect(await service.history(7)).toEqual({ items: [] });
    expect(prisma.seasonProgress.findMany).not.toHaveBeenCalled();
  });

  it('lists past seasons with the level their points reached', async () => {
    const { prisma, service } = setup();

    prisma.userLestaAccount.findUnique.mockResolvedValue(Object.assign(mock<UserLestaAccount>(), { userId: 'u' }));
    prisma.seasonProgress.findMany.mockResolvedValue([row({ season: '2026-q2', points: pointsForLevel(3) + 1 })]);

    expect(await service.history(7)).toEqual({ items: [{ season: '2026-q2', points: pointsForLevel(3) + 1, level: 3 }] });
  });
});
