import { Inject, Injectable } from '@nestjs/common';
import { PLAY_MODES } from '@otmetki/schemas';
import { subDays } from 'date-fns';

import type { MetaQueries } from '../meta.types';

import { PrismaService } from '../../../../../core';
import { bonusTypesOfMode } from '../../../../reference';
import { MODE_META_AGGREGATE } from '../config/meta.constants';
import { META_TOKENS } from '../config/tokens.constants';
import { toModeRecord } from '../mappers/mode-meta.mappers';

@Injectable()
export class ModeMetaAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(META_TOKENS.queries) private readonly queries: MetaQueries
  ) {}

  async compute() {
    const computedAt = new Date();
    const { windowDays } = MODE_META_AGGREGATE;
    const since = subDays(computedAt, windowDays);
    const counts: Record<string, number> = {};

    for (const mode of PLAY_MODES) {
      const rows = await this.queries.modeMetaRows({ db: this.prisma.$kysely, battleTypes: bonusTypesOfMode(mode), since });

      await this.prisma.$transaction([
        this.prisma.modeTankAggregate.deleteMany({ where: { mode } }),
        this.prisma.modeTankAggregate.createMany({ data: rows.map((row) => toModeRecord({ row, mode, windowDays, computedAt })) })
      ]);

      counts[mode] = rows.length;
    }

    return counts;
  }
}
