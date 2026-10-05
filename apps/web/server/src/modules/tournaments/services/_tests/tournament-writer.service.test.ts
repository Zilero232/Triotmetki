import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { TournamentParticipant } from '../../../../../generated';
import type { CommunityAccountsService, PlayerStats } from '../../../community-core';
import type { Bracket } from '../../lib/bracket/bracket.types';
import type { TournamentSeedsQueries } from '../../queries/tournament-seeds.types';
import type { TournamentWithParticipants } from '../../selects/tournament.types';

import { Prisma } from '../../../../../generated';
import { AppBadRequestException, AppConflictException, AppForbiddenException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { TOURNAMENT } from '../../config/tournaments.constants';
import { TournamentReaderService } from '../tournament-reader.service';
import { TournamentWriterService } from '../tournament-writer.service';

const now = new Date('2026-09-25T12:00:00Z');
const id = '99999999-9999-4999-8999-999999999999';

const participant = (accountId: bigint): TournamentParticipant => ({
  tournamentId: id,
  accountId,
  teamName: null,
  seed: null,
  verified: true,
  createdAt: now
});

const tournament: TournamentWithParticipants = {
  id,
  organizerUserId: 'organizer',
  slug: 'autumn-cup-abc123',
  title: 'Autumn cup',
  description: null,
  rules: { maxParticipants: TOURNAMENT.maxParticipants },
  requirements: {},
  bracket: null,
  status: 'registration',
  registrationEndsAt: null,
  startsAt: addDays(new Date(), 30),
  createdAt: now,
  participants: []
};

const entrants = (overrides: Partial<TournamentWithParticipants>): TournamentWithParticipants => ({ ...tournament, ...overrides });

const stats = (wn8: number): PlayerStats => ({ battles: 5000, wn8, winRate: 0.55 });

const finalOf = (a: number, b: number): Bracket => ({ size: 2, rounds: [[{ round: 0, index: 0, a, b, winner: null }]] });

const semifinals: Bracket = {
  size: 4,
  rounds: [
    [
      { round: 0, index: 0, a: 1, b: 4, winner: null },
      { round: 0, index: 1, a: 2, b: 3, winner: null }
    ],
    [{ round: 1, index: 0, a: null, b: null, winner: null }]
  ]
};

const createService = () => {
  const prisma = mockPrismaService();
  const accounts = mock<CommunityAccountsService>();
  const queries = mock<TournamentSeedsQueries>();

  accounts.accountOf.mockResolvedValue(7n);
  accounts.statsOf.mockResolvedValue(new Map());
  accounts.nicknamesOf.mockResolvedValue(new Map());
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return {
    service: new TournamentWriterService(prisma, accounts, new TournamentReaderService(prisma, accounts), queries),
    prisma,
    accounts,
    queries
  };
};

describe('TournamentWriterService.register', () => {
  it('rejects a player below the stat requirements', async () => {
    const { service, prisma, accounts } = createService();
    const minWn8 = 2000;

    prisma.tournament.findUnique.mockResolvedValue({ ...tournament, requirements: { minWn8 } });
    accounts.statsOf.mockResolvedValue(new Map([[7n, stats(minWn8 - 1)]]));

    await expect(service.register({ id, userId: 'u1' })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.tournamentParticipant.create).not.toHaveBeenCalled();
  });

  it('rejects a player without stats when the tournament has requirements', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue({ ...tournament, requirements: { minBattles: 100 } });

    await expect(service.register({ id, userId: 'u1' })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('rejects a full tournament', async () => {
    const { service, prisma, accounts } = createService();
    const capacity = TOURNAMENT.minParticipants;

    prisma.tournament.findUnique.mockResolvedValue(
      entrants({
        rules: { maxParticipants: capacity },
        participants: Array.from({ length: capacity }, (_, index) => participant(BigInt(index + 100)))
      })
    );

    await expect(service.register({ id, userId: 'u1' })).rejects.toBeInstanceOf(AppConflictException);
    expect(accounts.accountOf).not.toHaveBeenCalled();
  });

  it('rejects registration after the deadline', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue({ ...tournament, registrationEndsAt: new Date(Date.now() - 1000) });

    await expect(service.register({ id, userId: 'u1' })).rejects.toBeInstanceOf(AppConflictException);
  });

  it('registers a player who meets the requirements as verified', async () => {
    const { service, prisma, accounts } = createService();
    const minWn8 = 2000;

    prisma.tournament.findUnique.mockResolvedValue({ ...tournament, requirements: { minWn8 } });
    prisma.tournament.findUniqueOrThrow.mockResolvedValue(entrants({ participants: [participant(7n)] }));
    accounts.statsOf.mockResolvedValue(new Map([[7n, stats(minWn8)]]));

    const view = await service.register({ id, userId: 'u1', teamName: 'Crew' });

    expect(prisma.tournamentParticipant.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tournamentId: id, accountId: 7n, teamName: 'Crew', verified: true } })
    );

    expect(view.participants).toHaveLength(1);
  });
});

describe('TournamentWriterService.register under concurrency', () => {
  it('rejects the entry when the last slot was taken while the requirements were checked', async () => {
    const { service, prisma } = createService();
    const capacity = TOURNAMENT.minParticipants;
    const open = entrants({ rules: { maxParticipants: capacity } });
    const full = entrants({
      rules: { maxParticipants: capacity },
      participants: Array.from({ length: capacity }, (_, index) => participant(BigInt(index + 100)))
    });

    prisma.tournament.findUnique.mockResolvedValue(open);
    prisma.tournament.findUniqueOrThrow.mockResolvedValue(full);

    await expect(service.register({ id, userId: 'u1' })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.tournamentParticipant.create).not.toHaveBeenCalled();
  });

  it('inserts the participant inside a serializable transaction', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue(tournament);
    prisma.tournament.findUniqueOrThrow.mockResolvedValue(tournament);

    await service.register({ id, userId: 'u1' });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('turns a serialization failure into a conflict', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue(tournament);
    prisma.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' }));

    await expect(service.register({ id, userId: 'u1' })).rejects.toBeInstanceOf(AppConflictException);
  });
});

describe('TournamentWriterService.start', () => {
  it('seeds participants by WN8, strongest first', async () => {
    const { service, prisma, accounts, queries } = createService();

    prisma.tournament.findFirst.mockResolvedValue(entrants({ participants: [participant(1n), participant(2n), participant(3n)] }));
    prisma.tournament.update.mockResolvedValue({ ...tournament, status: 'running' });

    accounts.statsOf.mockResolvedValue(
      new Map([
        [1n, stats(1000)],
        [2n, stats(3000)],
        [3n, stats(2000)]
      ])
    );

    await service.start({ id, userId: 'organizer' });

    expect(queries.writeParticipantSeeds.mock.calls[0]?.[0].seededAccountIds).toEqual([2, 3, 1]);
  });

  it('writes a bracket that gives the top seed the bye', async () => {
    const { service, prisma, accounts } = createService();

    prisma.tournament.findFirst.mockResolvedValue(entrants({ participants: [participant(1n), participant(2n), participant(3n)] }));
    prisma.tournament.update.mockResolvedValue({ ...tournament, status: 'running' });

    accounts.statsOf.mockResolvedValue(
      new Map([
        [1n, stats(1000)],
        [2n, stats(3000)],
        [3n, stats(2000)]
      ])
    );

    await service.start({ id, userId: 'organizer' });

    expect(prisma.tournament.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'running',
          bracket: expect.objectContaining({
            rounds: expect.arrayContaining([expect.arrayContaining([expect.objectContaining({ a: 2, b: null, winner: 2 })])])
          })
        }
      })
    );
  });

  it('needs the minimum number of participants', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findFirst.mockResolvedValue(
      entrants({
        participants: Array.from({ length: TOURNAMENT.minParticipants - 1 }, (_, index) => participant(BigInt(index + 1)))
      })
    );

    await expect(service.start({ id, userId: 'organizer' })).rejects.toBeInstanceOf(AppBadRequestException);
    expect(prisma.tournament.update).not.toHaveBeenCalled();
  });

  it('only starts a tournament in registration', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findFirst.mockResolvedValue(entrants({ status: 'draft', participants: [participant(1n), participant(2n)] }));

    await expect(service.start({ id, userId: 'organizer' })).rejects.toBeInstanceOf(AppConflictException);
  });
});

describe('TournamentWriterService.reportMatch', () => {
  it('finishes the tournament when the final is decided', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findFirst.mockResolvedValue({ ...tournament, status: 'running', bracket: finalOf(1, 2) });
    prisma.tournament.update.mockResolvedValue({ ...tournament, status: 'finished' });

    await service.reportMatch({ id, userId: 'organizer', round: 0, index: 0, winner: 2 });

    expect(prisma.tournament.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'finished' }) }));
  });

  it('keeps the tournament running after an early round', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findFirst.mockResolvedValue({ ...tournament, status: 'running', bracket: semifinals });
    prisma.tournament.update.mockResolvedValue({ ...tournament, status: 'running' });

    await service.reportMatch({ id, userId: 'organizer', round: 0, index: 0, winner: 1 });

    expect(prisma.tournament.update).toHaveBeenCalledWith(expect.objectContaining({ data: { bracket: expect.anything() } }));
  });

  it('keeps the tournament running while the final round has no match yet', async () => {
    const { service, prisma } = createService();
    const unfinished: Bracket = { size: 2, rounds: [[{ round: 0, index: 0, a: 1, b: 2, winner: null }], []] };

    prisma.tournament.findFirst.mockResolvedValue({ ...tournament, status: 'running', bracket: unfinished });
    prisma.tournament.update.mockResolvedValue({ ...tournament, status: 'running' });

    await service.reportMatch({ id, userId: 'organizer', round: 0, index: 0, winner: 1 });

    expect(prisma.tournament.update).toHaveBeenCalledWith(expect.objectContaining({ data: { bracket: expect.anything() } }));
  });

  it('maps a bracket error to a bad request', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findFirst.mockResolvedValue({ ...tournament, status: 'running', bracket: finalOf(1, 2) });

    await expect(service.reportMatch({ id, userId: 'organizer', round: 0, index: 0, winner: 3 })).rejects.toBeInstanceOf(AppBadRequestException);
    expect(prisma.tournament.update).not.toHaveBeenCalled();
  });

  it('refuses a tournament that is not running', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findFirst.mockResolvedValue({ ...tournament, status: 'finished', bracket: finalOf(1, 2) });

    await expect(service.reportMatch({ id, userId: 'organizer', round: 0, index: 0, winner: 1 })).rejects.toBeInstanceOf(AppConflictException);
  });
});

describe('TournamentWriterService.create', () => {
  it('refuses a registration deadline after the start', async () => {
    const { service, prisma } = createService();
    const startsAt = addDays(new Date(), 7);

    await expect(
      service.create({
        userId: 'organizer',
        title: 'Autumn cup',
        requirements: {},
        maxParticipants: TOURNAMENT.maxParticipants,
        startsAt: startsAt.toISOString(),
        registrationEndsAt: addDays(startsAt, 1).toISOString(),
        openRegistration: false
      })
    ).rejects.toBeInstanceOf(AppBadRequestException);

    expect(prisma.tournament.create).not.toHaveBeenCalled();
  });
});

describe('TournamentWriterService.register without a deadline', () => {
  it('closes registration once the tournament has started', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue({ ...tournament, startsAt: new Date(Date.now() - 1000) });

    await expect(service.register({ id, userId: 'u1' })).rejects.toBeInstanceOf(AppConflictException);
  });
});

describe('TournamentWriterService.start under concurrency', () => {
  it('claims the start inside a serializable transaction and maps a conflict', async () => {
    const { service, prisma } = createService();

    prisma.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' }));

    await expect(service.start({ id, userId: 'organizer' })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
});

describe('TournamentWriterService.reportMatch under concurrency', () => {
  it('reports inside a serializable transaction so parallel results cannot overwrite each other', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findFirst.mockResolvedValue({ ...tournament, status: 'running', bracket: semifinals });
    prisma.tournament.update.mockResolvedValue({ ...tournament, status: 'running' });

    await service.reportMatch({ id, userId: 'organizer', round: 0, index: 0, winner: 1 });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
});

describe('TournamentWriterService.create and open', () => {
  it('opens registration in the same write when asked', async () => {
    const { service, prisma } = createService();

    prisma.tournament.create.mockResolvedValue(tournament);

    await service.create({
      userId: 'organizer',
      title: 'Autumn cup',
      requirements: {},
      maxParticipants: TOURNAMENT.maxParticipants,
      startsAt: addDays(new Date(), 7).toISOString(),
      openRegistration: true
    });

    expect(prisma.tournament.create.mock.calls[0]?.[0].data).toMatchObject({ status: 'registration' });
  });
});

describe('TournamentWriterService.withdraw', () => {
  it('removes the entry while registration is open', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue(entrants({}));
    prisma.tournamentParticipant.deleteMany.mockResolvedValue({ count: 1 });
    prisma.tournament.findUniqueOrThrow.mockResolvedValue(entrants({}));

    await service.withdraw({ id, userId: 'player' });

    expect(prisma.tournamentParticipant.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tournamentId: id, accountId: 7n } }));
  });

  it('refuses once the tournament is running', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue(entrants({ status: 'running' }));

    await expect(service.withdraw({ id, userId: 'player' })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.tournamentParticipant.deleteMany).not.toHaveBeenCalled();
  });
});
