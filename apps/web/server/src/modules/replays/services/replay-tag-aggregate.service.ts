import { Injectable } from '@nestjs/common';

import type { TagBackfillOutcome } from '../replays.types';

import { PrismaService } from '../../../core';
import { REPLAY_TAGGING } from '../config/tagging.constants';
import { replayTagColumns } from '../lib/replay-tags/replay-tags';
import { readStoredSummary } from '../lib/stored-summary/stored-summary';

@Injectable()
export class ReplayTagAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<TagBackfillOutcome> {
    const rows = await this.prisma.replay.findMany({
      where: { status: 'parsed', tagsVersion: { lt: REPLAY_TAGGING.version } },
      orderBy: { createdAt: 'asc' },
      take: REPLAY_TAGGING.backfillBatch,
      select: { id: true, summary: true }
    });

    const updates = rows.map((row) => {
      const summary = readStoredSummary(row.summary);

      return { id: row.id, data: summary ? replayTagColumns(summary) : { tagsVersion: REPLAY_TAGGING.version } };
    });

    if (updates.length > 0) {
      await this.prisma.$transaction(updates.map(({ id, data }) => this.prisma.replay.update({ where: { id }, data })));
    }

    return { tagged: updates.filter(({ data }) => 'tags' in data).length, skipped: updates.filter(({ data }) => !('tags' in data)).length };
  }
}
