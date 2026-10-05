import { Injectable } from '@nestjs/common';
import { chunk } from 'remeda';

import type { LeagueStats } from '../lib/league/league.types';
import type { LeagueStatsInput } from '../social.types';

import { PrismaService } from '../../../core';
import { LEAGUE_DIVISION } from '../config/leagues.constants';
import { SnapshotEventsReaderService } from './snapshot-events-reader.service';

@Injectable()
export class LeagueStatsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SnapshotEventsReaderService
  ) {}

  async weekStats({ accountIds, start, end, withMarks }: LeagueStatsInput): Promise<Map<bigint, LeagueStats>> {
    const stats = new Map<bigint, LeagueStats>(
      accountIds.map((accountId) => [accountId, { accountId, battles: 0, damage: 0, wn8Weighted: 0, wn8Battles: 0, marks: 0 }])
    );

    for (const batch of chunk(accountIds, LEAGUE_DIVISION.batchSize)) {
      const [sessions, marks] = await Promise.all([
        this.prisma.playSession.findMany({
          where: { accountId: { in: batch }, source: 'api', kind: 'day', startedAt: { gte: start, lt: end } },
          select: { accountId: true, battles: true, damageDealt: true, wn8: true }
        }),
        withMarks ? this.events.markCounts({ accountIds: batch, since: start, until: end }) : new Map<bigint, number>()
      ]);

      for (const [accountId, count] of marks) {
        const entry = stats.get(accountId);

        if (entry) {
          entry.marks = count;
        }
      }

      for (const session of sessions) {
        const entry = stats.get(session.accountId);

        if (!entry) {
          continue;
        }

        entry.battles += session.battles;
        entry.damage += session.damageDealt;

        if (session.wn8 !== null) {
          entry.wn8Weighted += session.wn8 * session.battles;
          entry.wn8Battles += session.battles;
        }
      }
    }

    return stats;
  }
}
