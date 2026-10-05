import { COMPETITION } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Competition, CompetitionEntry, CompetitionTeam, UserLestaAccount } from '../../../../../generated';
import type { EntitlementsService } from '../../../billing';
import type { CompetitionCreateInput } from '../../competitions.types';
import type { CompetitionWithSummary } from '../../selects/competition-summary.types';

import { Prisma } from '../../../../../generated';
import { AppForbiddenException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { COMPETITION_RUN } from '../../config/competitions.constants';
import { CompetitionReaderService } from '../competition-reader.service';
import { CompetitionWriterService } from '../competition-writer.service';

const now = new Date('2026-09-22T12:00:00Z');
const startsAt = new Date('2026-09-20T00:00:00Z');
const endsAt = new Date('2026-09-25T00:00:00Z');

const competition = (fields: Partial<Competition> = {}): Competition => ({
  id: 'c1',
  slug: 'cup',
  ownerUserId: 'owner',
  title: 'Cup',
  description: null,
  visibility: 'public',
  mode: 'random',
  battlesPerPlayer: 10,
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

const summaryRow = (fields: Partial<Competition> = {}, leader?: { score: number }): CompetitionWithSummary => ({
  ...competition(fields),
  owner: { name: 'Org' },
  teams: leader ? [{ id: 't1', name: 'Leaders', score: leader.score, battles: 1 }] : [],
  _count: { teams: 0, entries: 0 }
});

const uniqueViolation = () => new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });

const createInput: Omit<CompetitionCreateInput, 'userId'> = {
  title: 'Weekend cup',
  visibility: 'public',
  mode: 'random',
  battlesPerPlayer: 10,
  scoring: COMPETITION.defaultScoring,
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString()
};

const joinInput = { id: 'c1', userId: 'u1', accountId: 7, teamName: 'Crew', inviteCode: undefined };

const setup = () => {
  const prisma = mockPrismaService();
  const entitlements = mockDeep<EntitlementsService>();

  prisma.competition.findUniqueOrThrow.mockResolvedValue(summaryRow());
  prisma.competition.findUnique.mockResolvedValue(summaryRow());
  prisma.competitionTeam.findMany.mockResolvedValue([]);
  prisma.player.findMany.mockResolvedValue([]);
  prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ id: 'link' }));
  prisma.competitionTeam.count.mockResolvedValue(0);
  prisma.competitionTeam.create.mockResolvedValue(mock<CompetitionTeam>({ id: 'new-team' }));

  return { prisma, entitlements, service: new CompetitionWriterService(prisma, entitlements, new CompetitionReaderService(prisma)) };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CompetitionWriterService.create', () => {
  it('requires Plus for a private competition', async () => {
    const { entitlements, prisma, service } = setup();

    entitlements.assertFeature.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'Plus'));

    await expect(service.create({ ...createInput, visibility: 'private', userId: 'u1' })).rejects.toMatchObject({ status: 403 });
    expect(prisma.competition.create).not.toHaveBeenCalled();
  });

  it('does not check Plus for a public competition and gives it no invite code', async () => {
    const { entitlements, prisma, service } = setup();

    prisma.competition.count.mockResolvedValue(0);
    prisma.competition.create.mockResolvedValue(summaryRow());

    await service.create({ ...createInput, userId: 'u1' });

    expect(entitlements.assertFeature).not.toHaveBeenCalled();
    expect(prisma.competition.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ inviteCode: null }) }));
  });

  it('gives a private competition an invite code of the configured length', async () => {
    const { prisma, service } = setup();

    prisma.competition.count.mockResolvedValue(0);
    prisma.competition.create.mockResolvedValue(summaryRow({ visibility: 'private' }));

    await service.create({ ...createInput, visibility: 'private', userId: 'u1' });

    const code = prisma.competition.create.mock.calls[0]?.[0]?.data.inviteCode;

    expect(code).toHaveLength(COMPETITION.inviteCodeLength);
  });

  it('refuses an organizer who already runs the maximum number of active competitions', async () => {
    const { prisma, service } = setup();

    prisma.competition.count.mockResolvedValue(COMPETITION_RUN.maxActivePerOwner);

    await expect(service.create({ ...createInput, userId: 'u1' })).rejects.toMatchObject({ status: 409 });
    expect(prisma.competition.create).not.toHaveBeenCalled();
  });

  it('lets an organizer create one below the active limit', async () => {
    const { prisma, service } = setup();

    prisma.competition.count.mockResolvedValue(COMPETITION_RUN.maxActivePerOwner - 1);
    prisma.competition.create.mockResolvedValue(summaryRow());

    await service.create({ ...createInput, userId: 'u1' });

    expect(prisma.competition.create).toHaveBeenCalled();
  });
});

describe('CompetitionWriterService.join', () => {
  it('refuses a competition that does not exist', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(null);

    await expect(service.join(joinInput)).rejects.toMatchObject({ status: 404 });
  });

  it('refuses a private competition without the invite code', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition({ visibility: 'private', inviteCode: 'ABCD2345' }));
    prisma.competitionEntry.count.mockResolvedValue(0);

    await expect(service.join(joinInput)).rejects.toMatchObject({ status: 404 });
  });

  it('refuses a competition that ends exactly now', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition({ endsAt: now }));

    await expect(service.join(joinInput)).rejects.toMatchObject({ status: 409 });
    expect(prisma.competitionEntry.create).not.toHaveBeenCalled();
  });

  it('lets a player join before the competition starts', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition({ startsAt: new Date('2026-09-23T00:00:00Z') }));

    await service.join(joinInput);

    expect(prisma.competitionEntry.create).toHaveBeenCalled();
  });

  it('refuses an account not linked to the user', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());
    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.join(joinInput)).rejects.toMatchObject({ status: 403 });
  });

  it('refuses an unknown team', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());
    prisma.competitionTeam.findFirst.mockResolvedValue(null);

    await expect(service.join({ ...joinInput, teamName: undefined, teamId: 't9' })).rejects.toMatchObject({ status: 404 });
  });

  it('refuses a team that is already full', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());

    prisma.competitionTeam.findFirst.mockResolvedValue(
      Object.assign(mock<CompetitionTeam>({ id: 't1' }), { _count: { entries: COMPETITION.maxTeamSize } })
    );

    await expect(service.join({ ...joinInput, teamName: undefined, teamId: 't1' })).rejects.toMatchObject({ status: 409 });
    expect(prisma.competitionEntry.create).not.toHaveBeenCalled();
  });

  it('adds a player to a team with one seat left', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());

    prisma.competitionTeam.findFirst.mockResolvedValue(
      Object.assign(mock<CompetitionTeam>({ id: 't1' }), { _count: { entries: COMPETITION.maxTeamSize - 1 } })
    );

    await service.join({ ...joinInput, teamName: undefined, teamId: 't1' });

    expect(prisma.competitionEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ teamId: 't1', accountId: 7n }) })
    );
  });

  it('refuses a new team once the competition has the maximum number of teams', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());
    prisma.competitionTeam.count.mockResolvedValue(COMPETITION.maxTeams);

    await expect(service.join(joinInput)).rejects.toMatchObject({ status: 409 });
    expect(prisma.competitionTeam.create).not.toHaveBeenCalled();
  });

  it('refuses a new team with a blank name', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());

    await expect(service.join({ ...joinInput, teamName: '   ' })).rejects.toMatchObject({ status: 400 });
  });

  it('creates a new team under the trimmed name and enrols the player in it', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());

    await service.join({ ...joinInput, teamName: '  Crew  ' });

    expect(prisma.competitionTeam.create).toHaveBeenCalledWith(expect.objectContaining({ data: { competitionId: 'c1', name: 'Crew' } }));
    expect(prisma.competitionEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ teamId: 'new-team' }) }));
  });

  it('reports a clash when the team name is taken', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());
    prisma.competitionTeam.create.mockRejectedValue(uniqueViolation());

    await expect(service.join(joinInput)).rejects.toMatchObject({ status: 409 });
  });

  it('reports a clash when the account already takes part', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition());
    prisma.competitionEntry.create.mockRejectedValue(uniqueViolation());

    await expect(service.join(joinInput)).rejects.toMatchObject({ status: 409 });
  });

  it('rethrows any other database failure', async () => {
    const { prisma, service } = setup();
    const failure = new Error('connection lost');

    prisma.competition.findUnique.mockResolvedValue(competition());
    prisma.competitionEntry.create.mockRejectedValue(failure);

    await expect(service.join(joinInput)).rejects.toBe(failure);
  });
});

describe('CompetitionWriterService.leave', () => {
  it('refuses a user who does not take part', async () => {
    const { prisma, service } = setup();

    prisma.competitionEntry.findMany.mockResolvedValue([]);

    await expect(service.leave({ id: 'c1', userId: 'u1' })).rejects.toMatchObject({ status: 404 });
    expect(prisma.competitionEntry.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses to leave a finished competition so the final standings stay intact', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(competition({ startsAt: new Date('2020-01-01'), endsAt: new Date('2020-01-02') }));
    prisma.competitionEntry.findMany.mockResolvedValue([mock<CompetitionEntry>({ teamId: 't1' })]);

    await expect(service.leave({ id: 'c1', userId: 'u1' })).rejects.toMatchObject({ status: 409 });
    expect(prisma.competitionEntry.deleteMany).not.toHaveBeenCalled();
  });

  it('removes the user entries and then drops teams left empty', async () => {
    const { prisma, service } = setup();

    prisma.competitionEntry.findMany.mockResolvedValue([mock<CompetitionEntry>({ teamId: 't1' })]);

    await service.leave({ id: 'c1', userId: 'u1' });

    expect(prisma.competitionEntry.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { competitionId: 'c1', userId: 'u1' } }));

    expect(prisma.competitionTeam.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { competitionId: 'c1', entries: { none: {} } } })
    );

    expect(prisma.competitionEntry.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.competitionTeam.deleteMany.mock.invocationCallOrder[0] ?? 0
    );
  });
});

describe('CompetitionWriterService.remove', () => {
  it('refuses to delete a competition the user does not own', async () => {
    const { prisma, service } = setup();

    prisma.competition.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove({ id: 'c1', userId: 'u1' })).rejects.toMatchObject({ status: 404 });
  });

  it('deletes an owned competition', async () => {
    const { prisma, service } = setup();

    prisma.competition.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.remove({ id: 'c1', userId: 'owner' })).resolves.toBeUndefined();
  });
});
