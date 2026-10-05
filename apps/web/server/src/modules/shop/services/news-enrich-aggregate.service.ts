import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import { PrismaService } from '../../../core';
import { NEWS_ENRICH } from '../config/news.constants';
import { isPatchNotes, versionsOf } from '../lib/patch-notes/patch-notes';
import { matchTankNames } from '../lib/tank-mentions/tank-mentions';

@Injectable()
export class NewsEnrichAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  async run(now: Date): Promise<number> {
    const items = await this.prisma.newsItem.findMany({
      where: { enrichedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: NEWS_ENRICH.batch,
      select: { id: true, title: true, summary: true, kind: true, gameVersionId: true, tankIds: true }
    });

    if (items.length === 0) {
      return 0;
    }

    const versions = unique(items.flatMap((item) => (item.gameVersionId === null ? versionsOf(item.title) : [])));
    const [vehicles, gameVersions] = await Promise.all([
      this.prisma.vehicle.findMany({ select: { tankId: true, name: true } }),
      versions.length > 0 ? this.prisma.gameVersion.findMany({ where: { version: { in: versions } }, select: { id: true, version: true } }) : []
    ]);

    const versionIds = new Map(gameVersions.map((row) => [row.version, row.id]));

    await this.prisma.$transaction(
      items.map((item) => {
        const gameVersionId =
          item.gameVersionId ??
          versionsOf(item.title)
            .map((version) => versionIds.get(version))
            .find((id) => id !== undefined) ??
          null;

        const mentioned = matchTankNames({ text: `${item.title}\n${item.summary ?? ''}`, vehicles, minLength: NEWS_ENRICH.minTankNameLength });

        return this.prisma.newsItem.update({
          where: { id: item.id },
          data: {
            kind: isPatchNotes(item.title) ? 'patchNotes' : item.kind,
            gameVersionId,
            tankIds: unique([...item.tankIds, ...mentioned]),
            enrichedAt: now
          }
        });
      })
    );

    return items.length;
  }
}
