import { COMPETITION } from '@otmetki/schemas';
import { addHours } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, Competition, CompetitionEntry, CompetitionTeam, Prisma } from '../../../../../generated';
import type { NotificationService } from '../../../notifications';
import type { CatalogEntry, VehicleCatalogService } from '../../../reference';
import type { CompetitionBattlesQueries } from '../../queries/competition-battles.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { CompetitionScoringAggregateService } from '../competition-scoring-aggregate.service';

const startsAt = new Date('2026-09-20T00:00:00Z');
const endsAt = new Date('2026-09-25T00:00:00Z');
const graceEnd = addHours(endsAt, 6);
const running = new Date('2026-09-22T12:00:00Z');

const competition = (fields: Partial<Competition> = {}): Competition => ({
  id: 'c1',
  slug: 'cup',
  ownerUserId: 'owner',
  title: 'Cup',
  description: null,
  visibility: 'public',
  mode: 'random',
  battlesPerPlayer: 2,
  minTier: null,
  scoring: COMPETITION.defaultScoring,
  inviteCode: null,
  startsAt,
  endsAt,
  scoredAt: null,
  finishedAt: null,
  createdAt: startsAt,
  ...fields
});

const entry = (accountId: bigint, joinedAt = startsAt) => mock<CompetitionEntry>({ accountId, joinedAt });

const battle = (fields: Partial<Battle> = {}) =>
  mock<Battle>({
    tankId: 1,
    result: 'loss',
    damageDealt: 1_000,
    damageAssistedRadio: 0,
    damageAssistedTrack: 0,
    damageBlocked: 0,
    frags: 0,
    spotted: 0,
    xp: 0,
    survived: false,
    ...fields
  });

const team = (id: string, entries: { score: number; battles: number; userId: string }[]) =>
  Object.assign(mock<CompetitionTeam>({ id, name: id }), { entries });

const tier = (value: number) => mock<CatalogEntry>({ summary: { tier: value } });

const sessions = (battles: number | null) => ({
  _avg: {},
  _count: {},
  _max: {},
  _min: {},
  _sum: mock<Prisma.PlaySessionSumAggregateOutputType>({
    battles,
    wins: 0,
    damageDealt: 1_000,
    damageAssisted: 0,
    damageBlocked: 0,
    frags: 0,
    spotted: 0,
    xp: 0,
    survived: 0
  })
});

const setup = () => {
  const prisma = mockPrismaService();
  const queries = mock<CompetitionBattlesQueries>();
  const catalog = mockDeep<VehicleCatalogService>();
  const notifications = mockDeep<NotificationService>();

  prisma.competition.findMany.mockResolvedValue([competition()]);
  prisma.competitionEntry.findMany.mockResolvedValue([entry(1n)]);
  queries.competitionBattles.mockResolvedValue([]);
  prisma.competitionTeam.findMany.mockResolvedValue([]);
  prisma.$transaction.mockResolvedValue([]);
  prisma.playSession.aggregate.mockResolvedValue(sessions(null));

  return { prisma, queries, catalog, notifications, service: new CompetitionScoringAggregateService(prisma, catalog, notifications, queries) };
};

const battleWindow = (queries: ReturnType<typeof setup>['queries']) => {
  const input = queries.competitionBattles.mock.calls[0]?.[0];

  return input ? [input.from, input.until] : [];
};

const entryWrites = (prisma: ReturnType<typeof setup>['prisma']) =>
  prisma.competitionEntry.update.mock.calls.map(([args]) => ({ accountId: args.where.competitionId_accountId?.accountId, ...args.data }));

describe('CompetitionScoringAggregateService.run', () => {
  it('returns zero and writes nothing when no competition is running', async () => {
    const { prisma, service } = setup();

    prisma.competition.findMany.mockResolvedValue([]);

    expect(await service.run(running)).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('counts only the first battlesPerPlayer battles of an entry', async () => {
    const { prisma, queries, service } = setup();

    queries.competitionBattles.mockResolvedValue([battle(), battle(), battle()]);

    await service.run(running);

    expect(entryWrites(prisma)).toEqual([expect.objectContaining({ battles: 2, source: 'mod' })]);
  });

  it('scores a win above an otherwise identical loss', async () => {
    const { prisma, queries, service } = setup();

    prisma.competitionEntry.findMany.mockResolvedValue([entry(1n), entry(2n)]);
    queries.competitionBattles.mockResolvedValueOnce([battle({ result: 'win' })]).mockResolvedValueOnce([battle({ result: 'loss' })]);

    await service.run(running);

    const [winner, loser] = entryWrites(prisma);

    expect(Number(winner?.score)).toBeGreaterThan(Number(loser?.score));
  });

  it('counts battles from the join time when a player joins after the start', async () => {
    const { prisma, queries, service } = setup();
    const joinedAt = new Date('2026-09-21T08:00:00Z');

    prisma.competitionEntry.findMany.mockResolvedValue([entry(1n, joinedAt)]);

    await service.run(running);

    expect(battleWindow(queries)).toEqual([joinedAt, endsAt]);
  });

  it('counts battles from the start when a player joined before it', async () => {
    const { prisma, queries, service } = setup();

    prisma.competitionEntry.findMany.mockResolvedValue([entry(1n, new Date('2026-09-18T00:00:00Z'))]);

    await service.run(running);

    expect(battleWindow(queries)).toEqual([startsAt, endsAt]);
  });

  it('keeps battles exactly at the minimum tier and drops lower or unknown tanks', async () => {
    const { prisma, queries, catalog, service } = setup();

    prisma.competition.findMany.mockResolvedValue([competition({ minTier: 8, battlesPerPlayer: 10 })]);
    queries.competitionBattles.mockResolvedValue([battle({ tankId: 1 }), battle({ tankId: 2 }), battle({ tankId: 3 })]);

    catalog.all.mockResolvedValue(
      new Map([
        [1, tier(7)],
        [2, tier(8)]
      ])
    );

    await service.run(running);

    expect(entryWrites(prisma)).toEqual([expect.objectContaining({ battles: 1, source: 'mod' })]);
  });

  it('does not fall back to sessions when a tier limit filtered out every battle', async () => {
    const { prisma, queries, catalog, service } = setup();

    prisma.competition.findMany.mockResolvedValue([competition({ minTier: 8 })]);
    queries.competitionBattles.mockResolvedValue([battle({ tankId: 1 })]);
    catalog.all.mockResolvedValue(new Map([[1, tier(6)]]));

    await service.run(running);

    expect(entryWrites(prisma)).toEqual([expect.objectContaining({ score: 0, battles: 0, source: 'none' })]);
    expect(prisma.playSession.aggregate).not.toHaveBeenCalled();
  });

  it('does not load the vehicle catalog without a tier limit', async () => {
    const { queries, catalog, service } = setup();

    queries.competitionBattles.mockResolvedValue([battle()]);

    await service.run(running);

    expect(catalog.all).not.toHaveBeenCalled();
  });

  it('falls back to API sessions capped at battlesPerPlayer in a random competition without mod battles', async () => {
    const { prisma, service } = setup();

    prisma.playSession.aggregate.mockResolvedValue(sessions(5));

    await service.run(running);

    expect(entryWrites(prisma)).toEqual([expect.objectContaining({ battles: 2, source: 'snapshots' })]);
  });

  it('reports no score when there are neither battles nor sessions', async () => {
    const { prisma, service } = setup();

    prisma.playSession.aggregate.mockResolvedValue(sessions(null));

    await service.run(running);

    expect(entryWrites(prisma)).toEqual([expect.objectContaining({ score: 0, battles: 0, source: 'none' })]);
  });

  it('never reads sessions outside random mode', async () => {
    const { prisma, service } = setup();

    prisma.competition.findMany.mockResolvedValue([competition({ mode: 'ranked' })]);

    await service.run(running);

    expect(entryWrites(prisma)).toEqual([expect.objectContaining({ source: 'none' })]);
    expect(prisma.playSession.aggregate).not.toHaveBeenCalled();
  });

  it('scores with the default weights when the stored scoring is invalid', async () => {
    const { prisma, queries, service } = setup();

    prisma.competition.findMany.mockResolvedValue([competition({ id: 'broken', scoring: { damage: 'lots' } }), competition({ id: 'default' })]);
    queries.competitionBattles.mockResolvedValue([battle({ result: 'win', frags: 2 })]);

    await service.run(running);

    const [broken, fallback] = entryWrites(prisma);

    expect(broken?.score).toBeGreaterThan(0);
    expect(broken?.score).toBe(fallback?.score);
  });

  it('sums a team score from its entries without float drift', async () => {
    const { prisma, service } = setup();

    prisma.competitionTeam.findMany.mockResolvedValue([
      team('a', [
        { score: 0.1, battles: 1, userId: 'u1' },
        { score: 0.2, battles: 2, userId: 'u2' }
      ])
    ]);

    await service.run(running);

    expect(prisma.competitionTeam.update).toHaveBeenCalledWith(expect.objectContaining({ data: { score: 0.3, battles: 3 } }));
  });

  it('keeps the competition open until the grace period after the end has passed', async () => {
    const { prisma, notifications, service } = setup();

    prisma.competitionTeam.findMany.mockResolvedValue([team('a', [{ score: 10, battles: 1, userId: 'u1' }])]);

    await service.run(new Date(graceEnd.getTime() - 1));

    expect(prisma.competition.update.mock.calls[0]?.[0]?.data).not.toHaveProperty('finishedAt');
    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('finishes the competition exactly when the grace period ends', async () => {
    const { prisma, service } = setup();

    await service.run(graceEnd);

    expect(prisma.competition.update).toHaveBeenCalledWith(expect.objectContaining({ data: { scoredAt: graceEnd, finishedAt: graceEnd } }));
  });

  it('notifies every team of its final rank, with tied teams sharing a place', async () => {
    const { prisma, notifications, service } = setup();

    prisma.competitionTeam.findMany.mockResolvedValue([
      team('third', [{ score: 50, battles: 1, userId: 'u3' }]),
      team('tied-a', [{ score: 100, battles: 1, userId: 'u1' }]),
      team('tied-b', [{ score: 100, battles: 3, userId: 'u2' }])
    ]);

    await service.run(graceEnd);

    const ranks = new Map(notifications.notifyMany.mock.calls.map(([args]) => [args.userIds[0], args.notification]));

    expect(ranks.get('u1')).toMatchObject({ rank: 1, teams: 3 });
    expect(ranks.get('u2')).toMatchObject({ rank: 1, teams: 3 });
    expect(ranks.get('u3')).toMatchObject({ rank: 3, teams: 3 });
  });

  it('notifies a player with two accounts in one team only once', async () => {
    const { prisma, notifications, service } = setup();

    prisma.competitionTeam.findMany.mockResolvedValue([
      team('a', [
        { score: 10, battles: 1, userId: 'u1' },
        { score: 20, battles: 1, userId: 'u1' }
      ])
    ]);

    await service.run(graceEnd);

    expect(notifications.notifyMany).toHaveBeenCalledWith(expect.objectContaining({ userIds: ['u1'] }));
  });
});
