import type { MyModeStats } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { MODE_META, PLAY_MODES } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { unique } from 'remeda';

import type { MyModeStatsInput } from '../modes.types';
import type { ModesQueries } from '../providers/modes-queries.provider.types';

import { PrismaService } from '../../../core';
import { UserAccountsReaderService } from '../../accounts';
import { PlayerCareerReaderService } from '../../players';
import { bonusTypesOfMode, VehicleCatalogService } from '../../reference';
import { MODES_QUERIES } from '../config';
import { foldModeStats } from '../lib/my-mode-stats';
import { toMyModeRows } from '../mappers/my-mode-stats.mappers';

@Injectable()
export class MyModeStatsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly career: PlayerCareerReaderService,
    private readonly lestaAccounts: UserAccountsReaderService,
    @Inject(MODES_QUERIES) private readonly queries: ModesQueries
  ) {}

  async stats({ userId, query }: MyModeStatsInput): Promise<MyModeStats> {
    const accountId = await this.lestaAccounts.requirePrimaryAccountId({ userId, message: 'Link a Lesta account to see your own mode stats' });
    const since = subDays(new Date(), query.days);
    const types = PLAY_MODES.flatMap((mode) => bonusTypesOfMode(mode));

    const rows = await this.queries.myModeBattles({ db: this.prisma.$kysely, accountId: Number(accountId), battleTypes: types, since });
    const modeRows = toMyModeRows(rows);

    const vehicles = new Map(
      await Promise.all(unique(modeRows.map((row) => row.tankId)).map(async (tankId) => [tankId, await this.catalog.summary(tankId)] as const))
    );

    const career = await this.career.modes({ accountId, allowLive: false });

    return {
      accountId: Number(accountId),
      days: query.days,
      modes: foldModeStats({ rows: modeRows, vehicles, tanksLimit: MODE_META.myTanks }),
      career: career.modes
    };
  }
}
