import { COMPETITION } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Competition, CompetitionEntry, CompetitionTeam, Player, UserLestaAccount } from '../../../../../generated';
import type { EntitlementsService } from '../../../billing';
import type { CompetitionWithSummary } from '../../selects/competition-summary.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { CompetitionReaderService } from '../competition-reader.service';

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

const member = (fields: Partial<CompetitionEntry>) => mock<CompetitionEntry>({ source: 'mod', battles: 1, score: 0, ...fields });

const team = (id: string, score: number, entries: CompetitionEntry[] = []) =>
  Object.assign(mock<CompetitionTeam>({ id, name: id, score, battles: 1 }), { entries });

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

  return { prisma, entitlements, service: new CompetitionReaderService(prisma) };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CompetitionReaderService.list', () => {
  it('returns an empty page for "mine" without a viewer and never queries', async () => {
    const { prisma, service } = setup();

    const page = await service.list({ query: { mine: true, limit: 20, offset: 0 }, viewerUserId: null });

    expect(page).toEqual({ items: [], total: 0, limit: 20, offset: 0 });
    expect(prisma.competition.findMany).not.toHaveBeenCalled();
  });

  it('names no leader while the top team has not scored', async () => {
    const { prisma, service } = setup();

    prisma.competition.findMany.mockResolvedValue([summaryRow({}, { score: 0 })]);
    prisma.competition.count.mockResolvedValue(1);

    const page = await service.list({ query: { limit: 20, offset: 0 }, viewerUserId: null });

    expect(page.items[0]?.leader).toBeNull();
  });

  it('names the top team once it has scored', async () => {
    const { prisma, service } = setup();

    prisma.competition.findMany.mockResolvedValue([summaryRow({}, { score: 1 })]);
    prisma.competition.count.mockResolvedValue(1);

    const page = await service.list({ query: { limit: 20, offset: 0 }, viewerUserId: null });

    expect(page.items[0]?.leader).toBe('Leaders');
  });
});

describe('CompetitionReaderService.get', () => {
  it('hides a private competition from an anonymous viewer without a code', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(summaryRow({ visibility: 'private', inviteCode: 'ABCD2345' }));

    await expect(service.get({ slug: 'cup', viewerUserId: null, code: undefined })).rejects.toMatchObject({ status: 404 });
  });

  it('hides a private competition when the invite code is wrong', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(summaryRow({ visibility: 'private', inviteCode: 'ABCD2345' }));
    prisma.competitionEntry.count.mockResolvedValue(0);

    await expect(service.get({ slug: 'cup', viewerUserId: 'u1', code: 'WRONG' })).rejects.toMatchObject({ status: 404 });
  });

  it('opens a private competition with the invite code in any case', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(summaryRow({ visibility: 'private', inviteCode: 'ABCD2345' }));

    const view = await service.get({ slug: 'cup', viewerUserId: null, code: 'abcd2345' });

    expect(view.slug).toBe('cup');
  });

  it('opens a private competition to a participant without a code', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(summaryRow({ visibility: 'private', inviteCode: 'ABCD2345' }));
    prisma.competitionEntry.count.mockResolvedValue(1);

    const view = await service.get({ slug: 'cup', viewerUserId: 'u1', code: undefined });

    expect(view.isOwner).toBe(false);
  });

  it('shows the invite code to the owner only', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(summaryRow({ visibility: 'private', inviteCode: 'ABCD2345' }));

    const owner = await service.get({ slug: 'cup', viewerUserId: 'owner', code: undefined });
    const guest = await service.get({ slug: 'cup', viewerUserId: null, code: 'ABCD2345' });

    expect(owner.inviteCode).toBe('ABCD2345');
    expect(guest.inviteCode).toBeNull();
  });

  it('orders standings by rank with tied teams sharing a place', async () => {
    const { prisma, service } = setup();

    prisma.competitionTeam.findMany.mockResolvedValue([team('low', 10), team('tied-a', 50), team('tied-b', 50)]);

    const view = await service.get({ slug: 'cup', viewerUserId: null, code: undefined });

    expect(view.standings.map((standing) => [standing.id, standing.rank])).toEqual([
      ['tied-a', 1],
      ['tied-b', 1],
      ['low', 3]
    ]);
  });

  it('marks the viewer team and leaves unknown nicknames empty', async () => {
    const { prisma, service } = setup();

    prisma.competitionTeam.findMany.mockResolvedValue([
      team('other', 5, [member({ accountId: 1n, userId: 'u2' })]),
      team('mine', 5, [member({ accountId: 2n, userId: 'u1' })])
    ]);

    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 1n, nickname: 'Known' })]);

    const view = await service.get({ slug: 'cup', viewerUserId: 'u1', code: undefined });
    const nicknames = view.standings.flatMap((standing) => standing.members.map((entry) => [entry.accountId, entry.nickname]));

    expect(view.myTeamId).toBe('mine');

    expect(nicknames).toEqual(
      expect.arrayContaining([
        [1, 'Known'],
        [2, null]
      ])
    );
  });

  it('falls back to the default scoring when the stored one is invalid', async () => {
    const { prisma, service } = setup();

    prisma.competition.findUnique.mockResolvedValue(summaryRow({ scoring: { damage: 'lots' } }));

    const view = await service.get({ slug: 'cup', viewerUserId: null, code: undefined });

    expect(view.scoring).toEqual(COMPETITION.defaultScoring);
  });
});
