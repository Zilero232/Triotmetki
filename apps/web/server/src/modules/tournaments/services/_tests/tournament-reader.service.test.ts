import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { TournamentParticipant } from '../../../../../generated';
import type { CommunityAccountsService } from '../../../community-core';
import type { TournamentWithParticipants } from '../../selects/tournament.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { TOURNAMENT } from '../../config/tournaments.constants';
import { TournamentReaderService } from '../tournament-reader.service';

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

const createService = () => {
  const prisma = mockPrismaService();
  const accounts = mock<CommunityAccountsService>();

  accounts.accountOf.mockResolvedValue(7n);
  accounts.statsOf.mockResolvedValue(new Map());
  accounts.nicknamesOf.mockResolvedValue(new Map());
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return { service: new TournamentReaderService(prisma, accounts), prisma, accounts };
};

describe('TournamentReaderService.list', () => {
  it('never lists drafts, even when asked for them', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findMany.mockResolvedValue([]);
    prisma.tournament.count.mockResolvedValue(0);

    await service.list({ status: 'draft', limit: 20, offset: 0 });

    expect(prisma.tournament.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ status: { not: 'draft' } }, { status: 'draft' }] } })
    );
  });

  it('looks the nicknames of a whole page up in one query', async () => {
    const { service, prisma, accounts } = createService();

    prisma.tournament.findMany.mockResolvedValue([entrants({ participants: [participant(1n)] }), entrants({ participants: [participant(2n)] })]);
    prisma.tournament.count.mockResolvedValue(2);

    await service.list({ limit: 20, offset: 0 });

    expect(accounts.nicknamesOf).toHaveBeenCalledTimes(1);
    expect(accounts.nicknamesOf).toHaveBeenCalledWith([1n, 2n]);
  });
});

describe('TournamentReaderService.get', () => {
  it('shows a draft to its organizer only', async () => {
    const { service, prisma } = createService();

    prisma.tournament.findUnique.mockResolvedValue(entrants({ status: 'draft' }));

    await expect(service.get({ slug: tournament.slug, viewerUserId: 'organizer' })).resolves.toMatchObject({ status: 'draft' });
    await expect(service.get({ slug: tournament.slug, viewerUserId: 'stranger' })).rejects.toMatchObject({ response: { code: 'NOT_FOUND' } });
    await expect(service.get({ slug: tournament.slug, viewerUserId: null })).rejects.toMatchObject({ response: { code: 'NOT_FOUND' } });
  });
});
