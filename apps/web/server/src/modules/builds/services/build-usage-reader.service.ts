import type { BuildHistory, BuildUsage } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { BuildHistoryInput, BuildUsageInput } from '../builds.types';

import { PrismaService } from '../../../core';
import { RECOMMENDED_BUILD } from '../config/recommended.constants';
import { historyEntryOf, shellInfoOf, toBuildUsage } from '../mappers/build-usage-view.mappers';
import { BuildDataReaderService } from './build-data-reader.service';
import { BuildOptionsReaderService } from './build-options-reader.service';

@Injectable()
export class BuildUsageReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly data: BuildDataReaderService,
    private readonly buildOptions: BuildOptionsReaderService
  ) {}

  async usage({ tankId, mode, cohort }: BuildUsageInput): Promise<BuildUsage> {
    const [row, options, vehicle] = await Promise.all([
      this.prisma.buildUsageAggregate.findFirst({ where: { tankId, mode, cohort }, orderBy: { computedAt: 'desc' } }),
      this.buildOptions.options(tankId),
      this.data.vehicle(tankId)
    ]);

    return toBuildUsage({ row, options, shells: shellInfoOf(vehicle), mode, cohort });
  }

  async history({ tankId, query }: BuildHistoryInput): Promise<BuildHistory> {
    const { mode, cohort } = query;

    const [rows, options, vehicle] = await Promise.all([
      this.prisma.buildUsageAggregate.findMany({
        where: { tankId, mode, cohort },
        orderBy: { computedAt: 'desc' },
        take: RECOMMENDED_BUILD.historyLimit
      }),
      this.buildOptions.options(tankId),
      this.data.vehicle(tankId)
    ]);

    const shells = shellInfoOf(vehicle);

    return {
      tankId,
      mode,
      cohort,
      entries: rows.map((row) =>
        historyEntryOf({
          usage: toBuildUsage({ row, options, shells, mode, cohort }),
          gameVersion: row.gameVersion,
          computedAt: row.computedAt.toISOString()
        })
      )
    };
  }
}
