import type { CompetitionPage, Competition as CompetitionView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { COMPETITION } from '@otmetki/schemas';
import { match } from 'ts-pattern';

import type { Prisma } from '../../../../generated';
import type { CanViewInput, CompetitionGetInput, CompetitionListInput, ToViewInput } from '../competitions.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { rankTeams, readScoring } from '../lib/competition-scoring/competition-scoring';
import { toCompetitionStanding } from '../mappers/competition-standing.mappers';
import { toCompetitionSummary } from '../mappers/competition-summary.mappers';
import { COMPETITION_SUMMARY_INCLUDE } from '../selects/competition-summary.selects';

@Injectable()
export class CompetitionReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ query, viewerUserId }: CompetitionListInput): Promise<CompetitionPage> {
    const now = new Date();
    const visible: Prisma.CompetitionWhereInput = viewerUserId
      ? { OR: [{ visibility: 'public' }, { ownerUserId: viewerUserId }, { entries: { some: { userId: viewerUserId } } }] }
      : { visibility: 'public' };

    const mine: Prisma.CompetitionWhereInput =
      query.mine && viewerUserId ? { OR: [{ ownerUserId: viewerUserId }, { entries: { some: { userId: viewerUserId } } }] } : {};

    const status = match(query.status)
      .returnType<Prisma.CompetitionWhereInput>()
      .with('upcoming', () => ({ startsAt: { gt: now } }))
      .with('running', () => ({ startsAt: { lte: now }, endsAt: { gt: now } }))
      .with('finished', () => ({ endsAt: { lte: now } }))
      .otherwise(() => ({}));

    if (query.mine && !viewerUserId) {
      return { items: [], total: 0, limit: query.limit, offset: query.offset };
    }

    const where: Prisma.CompetitionWhereInput = { AND: [visible, mine, status] };

    return paginate({
      limit: query.limit,
      offset: query.offset,
      fetch: async (window) => {
        const rows = await this.prisma.competition.findMany({
          where,
          include: COMPETITION_SUMMARY_INCLUDE,
          orderBy: { startsAt: 'desc' },
          ...window
        });

        return rows.map((row) => toCompetitionSummary({ row, now }));
      },
      count: () => this.prisma.competition.count({ where })
    });
  }

  async get({ slug, viewerUserId, code }: CompetitionGetInput): Promise<CompetitionView> {
    const row = await this.prisma.competition.findUnique({ where: { slug }, include: COMPETITION_SUMMARY_INCLUDE });

    if (!row || !(await this.canView({ competition: row, viewerUserId, code }))) {
      throw new AppNotFoundException('NOT_FOUND', `No competition ${slug}`);
    }

    return this.view({ row, viewerUserId });
  }

  async canView({ competition, viewerUserId, code }: CanViewInput): Promise<boolean> {
    if (competition.visibility === 'public' || competition.ownerUserId === viewerUserId) {
      return true;
    }

    if (code && competition.inviteCode && code.toUpperCase() === competition.inviteCode) {
      return true;
    }

    if (!viewerUserId) {
      return false;
    }

    return (await this.prisma.competitionEntry.count({ where: { competitionId: competition.id, userId: viewerUserId } })) > 0;
  }

  async view({ row, viewerUserId }: ToViewInput): Promise<CompetitionView> {
    const teams = await this.prisma.competitionTeam.findMany({
      where: { competitionId: row.id },
      include: { entries: { orderBy: { score: 'desc' } } },
      orderBy: { createdAt: 'asc' }
    });

    const accountIds = teams.flatMap((team) => team.entries.map((entry) => entry.accountId));
    const players = await this.prisma.player.findMany({ where: { accountId: { in: accountIds } }, select: { accountId: true, nickname: true } });
    const nicknameOf = new Map(players.map((player) => [player.accountId, player.nickname]));
    const ranks = rankTeams(teams);
    const isOwner = row.ownerUserId === viewerUserId;
    const myTeam = viewerUserId ? teams.find((team) => team.entries.some((entry) => entry.userId === viewerUserId)) : undefined;

    return {
      ...toCompetitionSummary({ row, now: new Date() }),
      scoring: readScoring(row.scoring),
      maxTeamSize: COMPETITION.maxTeamSize,
      isOwner,
      myTeamId: myTeam?.id ?? null,
      inviteCode: isOwner ? row.inviteCode : null,
      scoredAt: row.scoredAt?.toISOString() ?? null,
      standings: teams
        .map((team) => toCompetitionStanding({ team, rank: ranks.get(team.id) ?? teams.length, nicknameOf }))
        .sort((left, right) => left.rank - right.rank)
    };
  }
}
