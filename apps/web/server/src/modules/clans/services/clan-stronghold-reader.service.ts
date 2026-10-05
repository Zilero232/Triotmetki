import type { ClanStronghold } from '@otmetki/schemas';

import { Inject, Injectable, Logger } from '@nestjs/common';

import type { LestaClient } from '../../../lib/lesta';
import type { StoredStronghold } from '../selects/clans.selects';

import { errorMessage, readNumber, readRecord, toJsonValue, toNumber } from '../../../common/lib';
import { LESTA_CLIENT, PrismaService } from '../../../core';
import { STRONGHOLD_FETCH } from '../config/stronghold.constants';
import { toStronghold } from '../mappers/stronghold.mappers';
import { CLAN_STRONGHOLD_SELECT } from '../selects/clans.selects';

@Injectable()
export class ClanStrongholdReaderService {
  private readonly logger = new Logger(ClanStrongholdReaderService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient
  ) {}

  async stronghold(clanId: bigint): Promise<ClanStronghold> {
    const [clan, snapshot, provinces] = await Promise.all([
      this.prisma.clan.findUnique({ where: { clanId }, select: CLAN_STRONGHOLD_SELECT }),
      this.prisma.clanSnapshot.findFirst({
        where: { clanId },
        orderBy: { capturedAt: 'desc' },
        select: { eloRating6: true, eloRating8: true, eloRating10: true }
      }),
      this.prisma.globalMapProvince.findMany({
        where: { ownerClanId: clanId },
        orderBy: { name: 'asc' },
        select: { provinceId: true, name: true, arenaId: true, dailyRevenue: true }
      })
    ]);

    const row = clan?.strongholdUpdatedAt ? clan : await this.fetch(clanId);
    const stored = readRecord(row?.stronghold);

    return toStronghold({
      clanId: toNumber(clanId),
      level: row?.strongholdLevel ?? null,
      stats: stored.stats ?? null,
      buildings: stored.buildings ?? null,
      reserves: stored.reserves ?? null,
      updatedAt: row?.strongholdUpdatedAt ?? null,
      elo: {
        eloRating6: snapshot?.eloRating6 ?? null,
        eloRating8: snapshot?.eloRating8 ?? null,
        eloRating10: snapshot?.eloRating10 ?? null
      },
      provinces
    });
  }

  private async fetch(clanId: bigint): Promise<StoredStronghold | null> {
    try {
      const response = await this.lesta.stronghold.claninfo({ ids: [Number(clanId)] });
      const info = response[String(clanId)];

      if (!info) {
        return null;
      }

      const record = readRecord(info);
      const level = STRONGHOLD_FETCH.levelKeys.map((key) => readNumber(record[key])).find((value) => value !== null) ?? null;

      return await this.prisma.clan.update({
        where: { clanId },
        data: { strongholdLevel: level, stronghold: toJsonValue({ stats: info }), strongholdUpdatedAt: new Date() },
        select: CLAN_STRONGHOLD_SELECT
      });
    } catch (error) {
      this.logger.warn(`stronghold of clan ${clanId} not fetched: ${errorMessage(error)}`);

      return null;
    }
  }
}
