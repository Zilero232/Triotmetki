import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { writeParticipantSeeds } from '../tournament-seeds.queries';

const SEED = {
  userId: 'organizer',
  tournamentId: '00000000-0000-4000-8000-000000000001',
  otherTournamentId: '00000000-0000-4000-8000-000000000002'
} as const;

const tournament = (id: string, slug: string) => ({
  id,
  organizerUserId: SEED.userId,
  slug,
  title: `Cup ${slug}`,
  requirements: {},
  rules: {},
  startsAt: new Date('2026-11-01T00:00:00Z')
});

describeWithDatabase('writeParticipantSeeds', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tournament_participant', 'tournament', 'user'] });
    await prisma.user.create({ data: { id: SEED.userId, name: 'Organizer', email: 'organizer@example.test' } });
    await prisma.tournament.createMany({ data: [tournament(SEED.tournamentId, 'one'), tournament(SEED.otherTournamentId, 'two')] });

    await prisma.tournamentParticipant.createMany({
      data: [
        { tournamentId: SEED.tournamentId, accountId: 101n },
        { tournamentId: SEED.tournamentId, accountId: 102n },
        { tournamentId: SEED.tournamentId, accountId: 103n },
        { tournamentId: SEED.otherTournamentId, accountId: 101n }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('numbers the participants of one tournament from 1 in the given order', async () => {
    await writeParticipantSeeds({ db: prisma.$kysely, tournamentId: SEED.tournamentId, seededAccountIds: [103, 101, 102] });

    const rows = await prisma.tournamentParticipant.findMany({
      orderBy: [{ tournamentId: 'asc' }, { accountId: 'asc' }],
      select: { tournamentId: true, accountId: true, seed: true }
    });

    expect(rows).toEqual([
      { tournamentId: SEED.tournamentId, accountId: 101n, seed: 2 },
      { tournamentId: SEED.tournamentId, accountId: 102n, seed: 3 },
      { tournamentId: SEED.tournamentId, accountId: 103n, seed: 1 },
      { tournamentId: SEED.otherTournamentId, accountId: 101n, seed: null }
    ]);
  });
});
