import { Inject, Injectable } from '@nestjs/common';
import { addHours, max } from 'date-fns';

import type { EntryScore, ModBattlesInput, ScoreCompetitionInput, ScoreEntryInput, SnapshotScoreInput } from '../competitions.types';
import type { CompetitionBattleRow, CompetitionBattlesQueries } from '../queries/competition-battles.types';

import { bonusTypesOfMode, moscowDayStart } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { NotificationService } from '../../notifications';
import { VehicleCatalogService } from '../../reference';
import { COMPETITION_RUN, NO_SCORE } from '../config/competitions.constants';
import { COMPETITION_QUERY_TOKENS } from '../config/queries.constants';
import { rankTeams, readScoring, scoreBattles, scoreTotals, teamTotals } from '../lib/competition-scoring/competition-scoring';
import { toScoredLine } from '../mappers/scored-line.mappers';

@Injectable()
export class CompetitionScoringAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly notifications: NotificationService,
    @Inject(COMPETITION_QUERY_TOKENS.battles) private readonly queries: CompetitionBattlesQueries
  ) {}

  async run(now = new Date()): Promise<number> {
    const competitions = await this.prisma.competition.findMany({ where: { startsAt: { lte: now }, finishedAt: null } });

    for (const competition of competitions) {
      await this.score({ competition, now });
    }

    return competitions.length;
  }

  private async score({ competition, now }: ScoreCompetitionInput): Promise<void> {
    const entries = await this.prisma.competitionEntry.findMany({ where: { competitionId: competition.id } });
    const catalog = competition.minTier === null ? null : await this.catalog.all();
    const results: (EntryScore & Pick<ScoreEntryInput, 'accountId'>)[] = [];

    for (const entry of entries) {
      results.push({
        accountId: entry.accountId,
        ...(await this.scoreEntry({ competition, catalog, accountId: entry.accountId, joinedAt: entry.joinedAt }))
      });
    }

    if (results.length > 0) {
      await this.prisma.$transaction(
        results.map(({ accountId, score, battles, source }) =>
          this.prisma.competitionEntry.update({
            where: { competitionId_accountId: { competitionId: competition.id, accountId } },
            data: { score, battles, source }
          })
        )
      );
    }

    const teams = await this.prisma.competitionTeam.findMany({
      where: { competitionId: competition.id },
      include: { entries: { select: { score: true, battles: true, userId: true } } }
    });

    const totals = teams.map((team) => ({
      id: team.id,
      name: team.name,
      ...teamTotals(team.entries),
      userIds: [...new Set(team.entries.map((entry) => entry.userId))]
    }));

    const isFinal = now >= addHours(competition.endsAt, COMPETITION_RUN.finishGraceHours);

    await this.prisma.$transaction([
      ...totals.map((team) => this.prisma.competitionTeam.update({ where: { id: team.id }, data: { score: team.score, battles: team.battles } })),
      this.prisma.competition.update({ where: { id: competition.id }, data: { scoredAt: now, ...(isFinal ? { finishedAt: now } : {}) } })
    ]);

    if (!isFinal) {
      return;
    }

    const ranks = rankTeams(totals);

    for (const team of totals) {
      await this.notifications.notifyMany({
        userIds: team.userIds,
        notification: {
          event: 'competitionFinished',
          competitionSlug: competition.slug,
          title: competition.title,
          teamName: team.name,
          rank: ranks.get(team.id) ?? totals.length,
          teams: Math.max(totals.length, 1)
        },
        dedupeKey: `competition-${competition.id}`
      });
    }
  }

  private async scoreEntry({ competition, catalog, accountId, joinedAt }: ScoreEntryInput): Promise<EntryScore> {
    const scoring = readScoring(competition.scoring);
    const from = max([competition.startsAt, joinedAt]);
    const limit = competition.battlesPerPlayer;
    const battles = await this.modBattles({ competition, accountId, from, limit });
    const eligible = battles.filter((battle) => !catalog || (catalog.get(battle.tankId)?.summary.tier ?? 0) >= (competition.minTier ?? 0));

    if (eligible.length > 0) {
      return { ...scoreBattles({ battles: eligible.map(toScoredLine), scoring, limit }), source: 'mod' };
    }

    if (competition.mode !== 'random' || competition.minTier !== null) {
      return NO_SCORE;
    }

    return this.snapshotScore({ competition, accountId, from, scoring, limit });
  }

  private async modBattles({ competition, accountId, from, limit }: ModBattlesInput): Promise<CompetitionBattleRow[]> {
    const battleTypes = bonusTypesOfMode(competition.mode);

    if (battleTypes.length === 0) {
      return [];
    }

    return this.queries.competitionBattles({
      db: this.prisma.$kysely,
      accountId: Number(accountId),
      battleTypes,
      from,
      until: competition.endsAt,
      limit: limit * COMPETITION_RUN.battlesFetchFactor
    });
  }

  private async snapshotScore({ competition, accountId, from, scoring, limit }: SnapshotScoreInput): Promise<EntryScore> {
    const sessions = await this.prisma.playSession.aggregate({
      where: { accountId, source: 'api', kind: 'day', startedAt: { gte: moscowDayStart(from), lt: competition.endsAt } },
      _sum: {
        battles: true,
        wins: true,
        damageDealt: true,
        damageAssisted: true,
        damageBlocked: true,
        frags: true,
        spotted: true,
        xp: true,
        survived: true
      }
    });

    const total = sessions._sum.battles ?? 0;

    if (total === 0) {
      return NO_SCORE;
    }

    const totals = {
      damage: sessions._sum.damageDealt ?? 0,
      assist: sessions._sum.damageAssisted ?? 0,
      blocked: sessions._sum.damageBlocked ?? 0,
      frags: sessions._sum.frags ?? 0,
      spotted: sessions._sum.spotted ?? 0,
      xp: sessions._sum.xp ?? 0,
      wins: sessions._sum.wins ?? 0,
      survived: sessions._sum.survived ?? 0
    };

    return { ...scoreTotals({ totals, battles: total, scoring, limit }), source: 'snapshots' };
  }
}
