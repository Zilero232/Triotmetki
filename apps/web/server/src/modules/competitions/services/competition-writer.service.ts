import type { Competition as CompetitionView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { COMPETITION } from '@otmetki/schemas';

import type { CompetitionCreateInput, CompetitionJoinInput, CompetitionOwnedInput, NewTeamInput, TeamLookupInput } from '../competitions.types';

import { AppBadRequestException, AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { randomCode } from '../../../common/lib';
import { isUniqueViolation, PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { titleSlug } from '../../community-core';
import { COMPETITION_RUN } from '../config/competitions.constants';
import { competitionStatus } from '../lib/competition-scoring/competition-scoring';
import { COMPETITION_SUMMARY_INCLUDE } from '../selects/competition-summary.selects';
import { CompetitionReaderService } from './competition-reader.service';

@Injectable()
export class CompetitionWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly reader: CompetitionReaderService
  ) {}

  async create({ userId, scoring, ...input }: CompetitionCreateInput): Promise<CompetitionView> {
    if (input.visibility === 'private') {
      await this.entitlements.assertFeature({ userId, feature: COMPETITION_RUN.plusFeature });
    }

    const active = await this.prisma.competition.count({ where: { ownerUserId: userId, endsAt: { gt: new Date() } } });

    if (active >= COMPETITION_RUN.maxActivePerOwner) {
      throw new AppConflictException('CONFLICT', `At most ${COMPETITION_RUN.maxActivePerOwner} active competitions per organizer`);
    }

    const slug = titleSlug({
      title: input.title,
      suffix: randomCode({ alphabet: COMPETITION_RUN.slugSuffixAlphabet, length: COMPETITION_RUN.slugSuffixLength })
    });

    const row = await this.prisma.competition.create({
      data: {
        slug,
        ownerUserId: userId,
        title: input.title,
        description: input.description ?? null,
        visibility: input.visibility,
        mode: input.mode,
        battlesPerPlayer: input.battlesPerPlayer,
        minTier: input.minTier ?? null,
        scoring,
        inviteCode:
          input.visibility === 'private' ? randomCode({ alphabet: COMPETITION_RUN.inviteAlphabet, length: COMPETITION.inviteCodeLength }) : null,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt)
      },
      include: COMPETITION_SUMMARY_INCLUDE
    });

    return this.reader.view({ row, viewerUserId: userId });
  }

  async join({ id, userId, accountId, teamId, teamName, inviteCode }: CompetitionJoinInput): Promise<CompetitionView> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });

    if (!competition || !(await this.reader.canView({ competition, viewerUserId: userId, code: inviteCode }))) {
      throw new AppNotFoundException('NOT_FOUND', `No competition ${id}`);
    }

    if (competitionStatus({ startsAt: competition.startsAt, endsAt: competition.endsAt, now: new Date() }) === 'finished') {
      throw new AppConflictException('CONFLICT', 'The competition is over');
    }

    const link = await this.prisma.userLestaAccount.findFirst({ where: { userId, accountId: BigInt(accountId) }, select: { id: true } });

    if (!link) {
      throw new AppForbiddenException('FORBIDDEN', 'Only a Lesta account linked to you can take part');
    }

    const team = teamId
      ? await this.existingTeam({ competitionId: competition.id, teamId })
      : await this.newTeam({ competitionId: competition.id, name: teamName ?? '' });

    try {
      await this.prisma.competitionEntry.create({ data: { competitionId: competition.id, accountId: BigInt(accountId), teamId: team, userId } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', 'This account already takes part');
      }

      throw error;
    }

    return this.byId({ id: competition.id, userId });
  }

  async leave({ id, userId }: CompetitionOwnedInput): Promise<CompetitionView> {
    const competition = await this.prisma.competition.findUnique({ where: { id }, select: { startsAt: true, endsAt: true } });

    if (competition && competitionStatus({ startsAt: competition.startsAt, endsAt: competition.endsAt, now: new Date() }) === 'finished') {
      throw new AppConflictException('CONFLICT', 'The competition is over');
    }

    const entries = await this.prisma.competitionEntry.findMany({ where: { competitionId: id, userId }, select: { teamId: true } });

    if (entries.length === 0) {
      throw new AppNotFoundException('NOT_FOUND', 'You do not take part in this competition');
    }

    await this.prisma.competitionEntry.deleteMany({ where: { competitionId: id, userId } });
    await this.prisma.competitionTeam.deleteMany({ where: { competitionId: id, entries: { none: {} } } });

    return this.byId({ id, userId });
  }

  async remove({ id, userId }: CompetitionOwnedInput): Promise<void> {
    const { count } = await this.prisma.competition.deleteMany({ where: { id, ownerUserId: userId } });

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No competition ${id} of yours`);
    }
  }

  private async byId({ id, userId }: CompetitionOwnedInput): Promise<CompetitionView> {
    const row = await this.prisma.competition.findUniqueOrThrow({ where: { id }, include: COMPETITION_SUMMARY_INCLUDE });

    return this.reader.view({ row, viewerUserId: userId });
  }

  private async existingTeam({ competitionId, teamId: id }: TeamLookupInput): Promise<string> {
    const team = await this.prisma.competitionTeam.findFirst({
      where: { id, competitionId },
      select: { id: true, _count: { select: { entries: true } } }
    });

    if (!team) {
      throw new AppNotFoundException('NOT_FOUND', `No team ${id}`);
    }

    if (team._count.entries >= COMPETITION.maxTeamSize) {
      throw new AppConflictException('CONFLICT', 'The team is full');
    }

    return team.id;
  }

  private async newTeam({ competitionId, name }: NewTeamInput): Promise<string> {
    const teams = await this.prisma.competitionTeam.count({ where: { competitionId } });

    if (teams >= COMPETITION.maxTeams) {
      throw new AppConflictException('CONFLICT', 'The competition has no room for another team');
    }

    if (name.trim().length === 0) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'Name the new team');
    }

    try {
      return (await this.prisma.competitionTeam.create({ data: { competitionId, name: name.trim() }, select: { id: true } })).id;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', 'A team with this name already exists');
      }

      throw error;
    }
  }
}
