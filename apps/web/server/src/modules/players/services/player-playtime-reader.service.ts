import type { Playtime } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { PlayerQueries } from '../providers/player-queries.provider.types';

import { PrismaService } from '../../../core';
import { PLAYER_QUERIES } from '../config/queries.constants';
import { PLAYTIME } from '../lib/playtime/playtime.constants';
import { toPlaytime } from '../mappers/playtime.mappers';

@Injectable()
export class PlayerPlaytimeReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PLAYER_QUERIES) private readonly queries: PlayerQueries
  ) {}

  async playtime(accountId: bigint): Promise<Playtime> {
    const window = {
      db: this.prisma.$kysely,
      accountId: Number(accountId),
      from: subDays(new Date(), PLAYTIME.windowDays),
      weekStartsOn: PLAYTIME.weekStartsOn
    };

    const battles = await this.queries.playtimeFromBattles(window);

    if (battles.length > 0) {
      return toPlaytime({ rows: battles, source: 'battles' });
    }

    const snapshots = await this.queries.playtimeFromDeltas(window);

    return toPlaytime({ rows: snapshots, source: snapshots.length > 0 ? 'snapshots' : 'none' });
  }
}
