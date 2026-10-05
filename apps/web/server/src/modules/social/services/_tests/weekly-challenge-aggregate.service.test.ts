import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AccountBadge, PlaySession, UserLestaAccount, WeeklyChallengeProgress } from '../../../../../generated';
import type { NotificationService } from '../../../notifications';
import type { WeeklyChallengeQueries } from '../../queries/weekly-challenge.types';
import type { SnapshotEventsReaderService } from '../snapshot-events-reader.service';

import { toIsoDate, weekWindow } from '../../../../common/lib';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { CHALLENGE_BADGES, WEEKLY_CHALLENGES } from '../../config/challenges.constants';
import { badgeCodeOf } from '../../lib/challenges/challenges';
import { WeeklyChallengeAggregateService } from '../weekly-challenge-aggregate.service';

const now = new Date('2026-09-23T12:00:00Z');
const { weekStart: start } = weekWindow(now);
const battlesChallenge = WEEKLY_CHALLENGES.find((definition) => definition.metric === 'battles');
const battlesTarget = battlesChallenge?.target ?? 0;
const battlesBadge = battlesChallenge ? badgeCodeOf(battlesChallenge) : '';

const link: UserLestaAccount = {
  id: 'link-1',
  userId: 'u1',
  accountId: 1n,
  accessToken: null,
  tokenExpiresAt: null,
  tokenStaleAt: null,
  garageSyncedAt: null,
  isPrimary: true,
  linkedAt: now,
  updatedAt: now
};

const session = (battles: number): PlaySession => ({
  id: 's1',
  accountId: 1n,
  source: 'api',
  kind: 'day',
  status: 'closed',
  day: now,
  startedAt: now,
  endedAt: now,
  lastActivityAt: now,
  battles,
  wins: 0,
  losses: 0,
  draws: 0,
  damageDealt: 0,
  damageAssisted: 0,
  damageBlocked: 0,
  frags: 0,
  spotted: 0,
  xp: 0,
  survived: 0,
  credits: null,
  wn8: null,
  broneIndex: null,
  tankDeltas: null,
  startCapturedAt: null,
  endCapturedAt: null,
  reportSentAt: null
});

const progress = (completedAt: Date | null): WeeklyChallengeProgress => ({
  accountId: 1n,
  weekStart: start,
  code: battlesChallenge?.code ?? '',
  progress: battlesTarget,
  target: battlesTarget,
  completedAt,
  updatedAt: now
});

const badge: AccountBadge = { accountId: 1n, badgeCode: battlesBadge, context: { times: 1, lastWeek: '2026-09-14' }, awardedAt: now };

const createService = () => {
  const prisma = mockPrismaService();
  const events = mock<SnapshotEventsReaderService>();
  const notifications = mock<NotificationService>();
  const queries = mock<WeeklyChallengeQueries>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.userLestaAccount.findMany.mockResolvedValue([link]);
  prisma.playSession.findMany.mockResolvedValue([session(battlesTarget)]);
  queries.challengeBattles.mockResolvedValue([]);
  prisma.tankBattleDelta.findMany.mockResolvedValue([]);
  prisma.vehicle.findMany.mockResolvedValue([]);
  prisma.weeklyChallengeProgress.findMany.mockResolvedValue([]);
  prisma.accountBadge.findMany.mockResolvedValue([]);
  events.markCounts.mockResolvedValue(new Map());

  return { service: new WeeklyChallengeAggregateService(prisma, events, notifications, queries), prisma, events, notifications };
};

describe('WeeklyChallengeAggregateService.evaluate', () => {
  it('awards the badge and notifies on the first completion', async () => {
    const { service, prisma, notifications } = createService();

    expect(await service.evaluate(now)).toBe(1);

    expect(prisma.accountBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId_badgeCode: { accountId: 1n, badgeCode: battlesBadge } },
        create: expect.objectContaining({ context: { times: 1, lastWeek: toIsoDate(start) } })
      })
    );

    expect(notifications.notifyAccount).toHaveBeenCalledTimes(1);

    expect(notifications.notifyAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 1n, notification: expect.objectContaining({ event: 'badgeAwarded', badgeCode: battlesBadge }) })
    );
  });

  it('does nothing again for a challenge already completed this week', async () => {
    const { service, prisma, notifications } = createService();

    prisma.weeklyChallengeProgress.findMany.mockResolvedValue([progress(now)]);

    expect(await service.evaluate(now)).toBe(0);
    expect(prisma.accountBadge.upsert).not.toHaveBeenCalled();
    expect(notifications.notifyAccount).not.toHaveBeenCalled();
  });

  it('counts a completion in a later week without notifying again', async () => {
    const { service, prisma, notifications } = createService();

    prisma.accountBadge.findMany.mockResolvedValue([badge]);

    expect(await service.evaluate(now)).toBe(1);
    expect(prisma.accountBadge.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { context: expect.objectContaining({ times: 2 }) } }));
    expect(notifications.notifyAccount).not.toHaveBeenCalled();
  });

  it('records progress for every challenge of the week', async () => {
    const { service, prisma } = createService();

    await service.evaluate(now);

    expect(prisma.weeklyChallengeProgress.upsert.mock.calls.map(([args]) => args.create.code)).toEqual(
      WEEKLY_CHALLENGES.map((definition) => definition.code)
    );
  });

  it('keeps an unfinished challenge open', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findMany.mockResolvedValue([session(battlesTarget - 1)]);

    expect(await service.evaluate(now)).toBe(0);

    expect(prisma.weeklyChallengeProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ code: battlesChallenge?.code, progress: battlesTarget - 1, completedAt: null }) })
    );
  });
});

describe('WeeklyChallengeAggregateService.evaluate paging', () => {
  it('walks every linked account page by page instead of stopping at the first page', async () => {
    const { service, prisma } = createService();
    const page = Array.from({ length: CHALLENGE_BADGES.accountsPerPage }, (_, index) => ({ ...link, accountId: BigInt(index + 1) }));

    prisma.userLestaAccount.findMany.mockResolvedValueOnce(page).mockResolvedValueOnce([{ ...link, accountId: 999_999n }]);

    await service.evaluate(now);

    const cursors = prisma.userLestaAccount.findMany.mock.calls.map(([args]) => args?.where);

    expect(cursors).toEqual([{}, { accountId: { gt: BigInt(CHALLENGE_BADGES.accountsPerPage) } }]);
  });
});
