import { Inject, Injectable, Logger } from '@nestjs/common';
import { startOfHour, subDays, subHours } from 'date-fns';

import type { LestaClients } from '../../../../core';
import type {
  ClanActivityInput,
  ClanSnapshotInput,
  LestaOrEmptyInput,
  ReplaceProvincesInput,
  SnapshotClanInput,
  SnapshotSources,
  WriteStrongholdInput
} from '../clans.types';
import type { ClansQueries } from '../providers/clans-queries.types';
import type { ClanActivityRow } from '../queries/clan-activity.types';

import { errorMessage, readNumber, readRecord, toJsonValue } from '../../../../common/lib';
import { LESTA_CLIENTS, PrismaService } from '../../../../core';
import { CLANS } from '../config/clans.constants';
import { ownedProvinces } from '../lib/clan-provinces';
import { CLANS_QUERIES } from '../providers/clans-queries.provider';

@Injectable()
export class ClanSnapshotSyncService {
  private readonly logger = new Logger(ClanSnapshotSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENTS) private readonly clients: LestaClients,
    @Inject(CLANS_QUERIES) private readonly queries: ClansQueries
  ) {}

  async snapshot({ clanIds, infos, now }: ClanSnapshotInput) {
    const live = clanIds.filter((clanId) => infos[String(clanId)]);

    if (live.length === 0) {
      return;
    }

    const [globalmap, stronghold, provinces, activity] = await Promise.all([
      this.lestaOrEmpty({ method: 'globalmap/claninfo', call: () => this.clients.bulk.globalmap.claninfo({ ids: live }) }),
      this.lestaOrEmpty({ method: 'stronghold/claninfo', call: () => this.clients.bulk.stronghold.claninfo({ ids: live }) }),
      this.lestaOrEmpty({ method: 'globalmap/clanprovinces', call: () => this.clients.bulk.globalmap.clanprovinces({ ids: live }) }),
      this.activity({ clanIds: live, now })
    ]);

    const sources: SnapshotSources = { infos, globalmap, stronghold, provinces, activity };

    for (const clanId of live) {
      await this.snapshotClan({ clanId, sources, now });
    }
  }

  private async snapshotClan({ clanId, sources, now }: SnapshotClanInput) {
    const id = BigInt(clanId);
    const key = String(clanId);
    const capturedAt = startOfHour(now);
    const ratings = readRecord(readRecord(sources.globalmap[key]).ratings);
    const fort = sources.stronghold[key];
    const members = sources.activity.get(clanId);

    await this.prisma.clanSnapshot.upsert({
      where: { clanId_capturedAt: { clanId: id, capturedAt } },
      create: {
        clanId: id,
        capturedAt,
        membersCount: sources.infos[key]?.members_count ?? 0,
        activeMembers7d: members?.activeMembers7d ?? null,
        avgWinRate: members?.avgWinRate ?? null,
        avgWn8: members?.avgWn8 ?? null,
        battlesDelta: members?.battlesDelta ?? null,
        eloRating6: readNumber(ratings[CLANS.eloKeys.eloRating6]),
        eloRating8: readNumber(ratings[CLANS.eloKeys.eloRating8]),
        eloRating10: readNumber(ratings[CLANS.eloKeys.eloRating10])
      },
      update: {}
    });

    if (fort) {
      await this.writeStronghold({ id, fort, now });
    }

    const owned = key in sources.provinces ? ownedProvinces(sources.provinces[key]) : null;

    if (owned) {
      await this.replaceProvinces({ clanId: id, provinces: owned });
    }
  }

  private async writeStronghold({ id, fort, now }: WriteStrongholdInput) {
    const record = readRecord(fort);
    const level = CLANS.strongholdLevelKeys.map((key) => readNumber(record[key])).find((value) => value !== null) ?? null;

    await this.prisma.clan.update({
      where: { clanId: id },
      data: { strongholdLevel: level, stronghold: toJsonValue({ stats: fort }), strongholdUpdatedAt: now }
    });
  }

  private async activity({ clanIds, now }: ClanActivityInput): Promise<Map<number, ClanActivityRow>> {
    const rows = await this.queries.clanActivity({
      db: this.prisma.$kysely,
      clanIds,
      battlesSince: subHours(now, CLANS.battlesWindowHours),
      activeSince: subDays(now, CLANS.activeMemberDays)
    });

    return new Map(rows.map((row) => [row.clanId, row]));
  }

  private async replaceProvinces({ clanId, provinces }: ReplaceProvincesInput) {
    await this.prisma.$transaction([
      this.prisma.globalMapProvince.deleteMany({
        where: { ownerClanId: clanId, provinceId: { notIn: provinces.map((province) => province.provinceId) } }
      }),
      ...provinces.map((province) =>
        this.prisma.globalMapProvince.upsert({
          where: { provinceId: province.provinceId },
          create: { ...province, ownerClanId: clanId },
          update: { ...province, ownerClanId: clanId }
        })
      )
    ]);
  }

  private async lestaOrEmpty({ method, call }: LestaOrEmptyInput): Promise<Record<string, unknown>> {
    try {
      return await call();
    } catch (error) {
      this.logger.warn(`${method} failed: ${errorMessage(error)}`);

      return {};
    }
  }
}
