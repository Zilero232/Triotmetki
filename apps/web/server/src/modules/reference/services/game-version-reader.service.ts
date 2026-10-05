import type { GameVersion } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { toIso } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { GAME_VERSION } from '../config/game-version.constants';

@Injectable()
export class GameVersionReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async current(): Promise<GameVersion> {
    const row = await this.prisma.gameVersion.findFirst({
      where: { source: GAME_VERSION.source, isTest: false },
      orderBy: [{ isCurrent: 'desc' }, { releasedAt: { sort: 'desc', nulls: 'last' } }, { detectedAt: 'desc' }],
      select: { version: true, title: true, releasedAt: true, notesUrl: true }
    });

    return {
      version: row?.version ?? null,
      title: row?.title ?? null,
      releasedAt: toIso(row?.releasedAt),
      notesUrl: row?.notesUrl ?? null
    };
  }
}
