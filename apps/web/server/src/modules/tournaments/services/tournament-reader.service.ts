import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../../generated';
import type { TournamentWithParticipants } from '../selects/tournament.types';
import type { TournamentPage, TournamentsQuery, TournamentView, TournamentViewWith, ViewTournamentInput } from '../tournaments.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { CommunityAccountsReaderService } from '../../community-core';
import { storedBracket, storedCapacity } from '../lib/stored-tournament/stored-tournament';
import { toTournamentView } from '../mappers/tournament-view.mappers';
import { TOURNAMENT_INCLUDE } from '../selects/tournament.selects';

@Injectable()
export class TournamentReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: CommunityAccountsReaderService
  ) {}

  async list({ status, limit, offset }: TournamentsQuery): Promise<TournamentPage> {
    const where: Prisma.TournamentWhereInput = { AND: [{ status: { not: 'draft' } }, ...(status ? [{ status }] : [])] };

    return paginate({
      limit,
      offset,
      fetch: async (window) => {
        const rows = await this.prisma.tournament.findMany({ where, orderBy: { startsAt: 'desc' }, ...window, include: TOURNAMENT_INCLUDE });
        const nicknames = await this.accounts.nicknamesOf(rows.flatMap((row) => row.participants.map((participant) => participant.accountId)));

        return rows.map((tournament) => this.viewWith({ tournament, nicknames }));
      },
      count: () => this.prisma.tournament.count({ where })
    });
  }

  async get({ slug, viewerUserId }: ViewTournamentInput): Promise<TournamentView> {
    const tournament = await this.prisma.tournament.findUnique({ where: { slug }, include: TOURNAMENT_INCLUDE });

    if (!tournament || (tournament.status === 'draft' && tournament.organizerUserId !== viewerUserId)) {
      throw new AppNotFoundException('NOT_FOUND', `No tournament ${slug}`);
    }

    return this.view(tournament);
  }

  async view(tournament: TournamentWithParticipants): Promise<TournamentView> {
    const nicknames = await this.accounts.nicknamesOf(tournament.participants.map((participant) => participant.accountId));

    return this.viewWith({ tournament, nicknames });
  }

  private viewWith({ tournament, nicknames }: TournamentViewWith): TournamentView {
    return toTournamentView({ tournament, nicknames, bracket: storedBracket(tournament.bracket), maxParticipants: storedCapacity(tournament.rules) });
  }
}
